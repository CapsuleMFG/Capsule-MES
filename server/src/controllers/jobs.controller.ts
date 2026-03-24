import { Request, Response } from 'express';
import { query, queryOne, execute, executeTransaction } from '../models/database';
import { generateEntriesForJob } from './scheduling.controller';
import type { Job, JobWorkflowProgress, JobMaterial, JobLabor, CreateJobRequest, UpdateJobRequest, UpdateWorkflowStageRequest, CreateMaterialRequest, UpdateMaterialRequest, CreateLaborRequest } from '../../../shared/types';
import { logger } from '../lib/logger';

/**
 * Auto-complete a workflow stage for a job.
 * Sets the named stage to 'Completed' (with timestamps) only if currently 'In Progress'.
 * Does nothing if already Completed, Not Started, or Blocked.
 */
export async function autoCompleteStage(jobId: number, stageName: string): Promise<void> {
    try {
        const row = await queryOne(
            `SELECT jwp.id, jwp.status
             FROM job_workflow_progress jwp
             JOIN workflow_stages ws ON jwp.stage_id = ws.id
             WHERE jwp.job_id = ? AND ws.name = ?`,
            [jobId, stageName]
        );

        if (!row || row.status !== 'In Progress') return;

        await execute(
            `UPDATE job_workflow_progress
             SET status = 'Completed',
                 started_at = COALESCE(started_at, NOW()),
                 completed_at = NOW(),
                 updated_at = NOW()
             WHERE id = ?`,
            [row.id]
        );

        logger.info('[autoCompleteStage] Stage auto-completed', { jobId, stageName });
    } catch (error) {
        logger.error('[autoCompleteStage] Error auto-completing stage', { jobId, stageName, error: error instanceof Error ? error.message : error });
    }
}

/**
 * Convert database row to Job object (camelCase)
 */
function mapRowToJob(row: any): Job {
    return {
        id: row.id,
        jobNumber: row.job_number,
        clientId: row.client_id,
        clientName: row.client_name,
        priority: row.priority,
        status: row.status,
        description: row.description,
        targetStartDate: row.target_start_date,
        targetEndDate: row.target_end_date,
        startDate: row.start_date,
        completedDate: row.completed_date,
        notes: row.notes,
        scPriority: row.sc_priority ?? null,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/jobs/analytics - High-level job analytics
 */
export async function getJobAnalytics(req: Request, res: Response): Promise<void> {
    try {
        // Pipeline: jobs per current workflow stage
        const pipelineRows = await query(`
            SELECT ws.name as stage_name, ws.color, ws.display_order,
                   COUNT(DISTINCT jwp.job_id) as count
            FROM workflow_stages ws
            LEFT JOIN job_workflow_progress jwp ON ws.id = jwp.stage_id
                AND jwp.status = 'In Progress'
                AND jwp.job_id IN (SELECT id FROM jobs WHERE status = 'Active')
            GROUP BY ws.id, ws.name, ws.color, ws.display_order
            ORDER BY ws.display_order
        `);

        // Schedule health (active jobs only)
        const today = new Date().toISOString().split('T')[0];
        const sevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        const overdueResult = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs
             WHERE status = 'Active' AND target_end_date IS NOT NULL
             AND target_end_date < ?`,
            [today]
        );

        const atRiskResult = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs
             WHERE status = 'Active' AND target_end_date IS NOT NULL
             AND target_end_date >= ? AND target_end_date <= ?`,
            [today, sevenDays]
        );

        const onTrackResult = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs
             WHERE status = 'Active'
             AND (target_end_date IS NULL OR target_end_date > ?)`,
            [sevenDays]
        );

        // Financial: material costs and labor hours for active jobs
        const materialCostResult = await queryOne<{ total: number }>(
            `SELECT COALESCE(SUM(jm.cost * jm.quantity), 0) as total
             FROM job_materials jm
             JOIN jobs j ON jm.job_id = j.id
             WHERE j.status = 'Active'`
        );

        const laborHoursResult = await queryOne<{ total: number }>(
            `SELECT COALESCE(SUM(jl.hours), 0) as total
             FROM job_labor jl
             JOIN jobs j ON jl.job_id = j.id
             WHERE j.status = 'Active'`
        );

        const activeJobCount = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs WHERE status = 'Active'`
        );

        const totalActiveJobs = activeJobCount?.count || 0;
        const totalMaterialCost = materialCostResult?.total || 0;

        res.json({
            pipeline: pipelineRows.map((r: any) => ({
                stageName: r.stage_name,
                color: r.color,
                displayOrder: r.display_order,
                count: Number(r.count),
            })),
            schedule: {
                onTrack: onTrackResult?.count || 0,
                atRisk: atRiskResult?.count || 0,
                overdue: overdueResult?.count || 0,
            },
            financial: {
                totalMaterialCost,
                totalLaborHours: laborHoursResult?.total || 0,
                avgCostPerJob: totalActiveJobs > 0 ? totalMaterialCost / totalActiveJobs : 0,
            },
        });
    } catch (error) {
        logger.error('Error fetching job analytics', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch job analytics' });
    }
}

/**
 * GET /api/jobs - List all jobs with optional filters
 */
export async function getJobs(req: Request, res: Response): Promise<void> {
    try {
        const { status, search } = req.query;

        let sql = `
            SELECT j.*, c.name as client_name
            FROM jobs j
            LEFT JOIN clients c ON j.client_id = c.id
            WHERE 1=1
        `;
        const params: any[] = [];

        if (status) {
            sql += ' AND j.status = ?';
            params.push(status);
        }


        if (search) {
            sql += ' AND (j.job_number LIKE ? OR j.description LIKE ? OR c.name LIKE ?)';
            const searchParam = `%${search}%`;
            params.push(searchParam, searchParam, searchParam);
        }

        sql += ' ORDER BY j.created_at DESC';

        const rows = await query(sql, params);
        const jobs = rows.map(mapRowToJob);

        // Fetch workflow progress for all jobs
        const jobIds = jobs.map((job: Job) => job.id);
        if (jobIds.length > 0) {
            const workflowProgressRows = await query(
                `SELECT jwp.*, ws.name as stage_name, ws.color as stage_color, ws.display_order as stage_order
                 FROM job_workflow_progress jwp
                 JOIN workflow_stages ws ON jwp.stage_id = ws.id
                 WHERE jwp.job_id IN (${jobIds.map(() => '?').join(',')})
                 ORDER BY ws.display_order`,
                jobIds
            );

            // Group workflow progress by job_id
            const progressByJobId: { [key: number]: any[] } = {};
            workflowProgressRows.forEach((wp: any) => {
                if (!progressByJobId[wp.job_id]) {
                    progressByJobId[wp.job_id] = [];
                }
                progressByJobId[wp.job_id].push({
                    id: wp.id,
                    jobId: wp.job_id,
                    stageId: wp.stage_id,
                    stageName: wp.stage_name,
                    stageColor: wp.stage_color,
                    stageOrder: wp.stage_order,
                    status: wp.status,
                    startedAt: wp.started_at,
                    completedAt: wp.completed_at,
                    assignee: wp.assignee,
                    notes: wp.notes,
                    createdAt: wp.created_at,
                    updatedAt: wp.updated_at,
                });
            });

            // Attach workflow progress to each job
            jobs.forEach((job: Job) => {
                job.workflowProgress = progressByJobId[job.id] || [];
            });
        }

        res.json(jobs);
    } catch (error) {
        logger.error('Error fetching jobs', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch jobs' });
    }
}

/**
 * POST /api/jobs - Create a new job
 */
export async function createJob(req: Request, res: Response): Promise<void> {
    try {
        const jobData: CreateJobRequest = req.body;

        // Validate required fields
        if (!jobData.jobNumber || !jobData.clientId || !jobData.description) {
            res.status(400).json({ error: 'Missing required fields: jobNumber, clientId, description' });
            return;
        }

        // Check for duplicate job number
        const existing = await queryOne('SELECT id FROM jobs WHERE job_number = ?', [jobData.jobNumber]);
        if (existing) {
            res.status(400).json({ error: 'Job number already exists' });
            return;
        }

        // Insert job
        const result = await execute(
            `INSERT INTO jobs (job_number, client_id, priority, description, target_start_date, target_end_date, notes, start_date)
             VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
            [
                jobData.jobNumber,
                jobData.clientId,
                null,
                jobData.description,
                jobData.targetStartDate || null,
                jobData.targetEndDate || null,
                jobData.notes || null
            ]
        );

        const jobId = result.lastID;

        // Initialize workflow progress for all stages
        const stages = await query('SELECT id, name FROM workflow_stages');
        for (const stage of stages) {
            await execute(
                `INSERT INTO job_workflow_progress (job_id, stage_id, status)
                 VALUES (?, ?, 'Not Started')`,
                [jobId, stage.id]
            );
        }

        // If an engineerId was provided, set the Engineering stage assignee
        if (jobData.engineerId) {
            const engineer = await queryOne<{ name: string }>(
                'SELECT name FROM engineers WHERE id = ?',
                [jobData.engineerId]
            );
            if (engineer) {
                const engStage = stages.find((s: any) => s.name === 'Engineering');
                if (engStage) {
                    await execute(
                        `UPDATE job_workflow_progress SET assignee = ? WHERE job_id = ? AND stage_id = ?`,
                        [engineer.name, jobId, engStage.id]
                    );
                }
            }
        }

        // Fetch and return the created job
        const job = await queryOne(
            `SELECT j.*, c.name as client_name
             FROM jobs j
             LEFT JOIN clients c ON j.client_id = c.id
             WHERE j.id = ?`,
            [jobId]
        );

        res.status(201).json(mapRowToJob(job));
    } catch (error) {
        logger.error('Error creating job', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create job' });
    }
}

/**
 * GET /api/jobs/:id - Get job details with workflow progress
 */
export async function getJobById(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const job = await queryOne(
            `SELECT j.*, c.name as client_name
             FROM jobs j
             LEFT JOIN clients c ON j.client_id = c.id
             WHERE j.id = ?`,
            [id]
        );

        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Get workflow progress
        const workflowProgress = await query(
            `SELECT jwp.*, ws.name as stage_name, ws.color as stage_color, ws.display_order as stage_order
             FROM job_workflow_progress jwp
             JOIN workflow_stages ws ON jwp.stage_id = ws.id
             WHERE jwp.job_id = ?
             ORDER BY ws.display_order`,
            [id]
        );

        const mappedJob = mapRowToJob(job);
        mappedJob.workflowProgress = workflowProgress.map((wp: any) => ({
            id: wp.id,
            jobId: wp.job_id,
            stageId: wp.stage_id,
            stageName: wp.stage_name,
            stageColor: wp.stage_color,
            stageOrder: wp.stage_order,
            status: wp.status,
            startedAt: wp.started_at,
            completedAt: wp.completed_at,
            assignee: wp.assignee,
            notes: wp.notes,
            createdAt: wp.created_at,
            updatedAt: wp.updated_at,
        }));

        res.json(mappedJob);
    } catch (error) {
        logger.error('Error fetching job', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch job' });
    }
}

/**
 * PUT /api/jobs/:id - Update job
 */
export async function updateJob(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates: UpdateJobRequest = req.body;

        const allowedFields = ['client_id', 'priority', 'status', 'description', 'target_start_date', 'target_end_date', 'start_date', 'completed_date', 'notes'];
        const setClause: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                setClause.push(`${snakeKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClause.push('updated_at = NOW()');
        params.push(id);

        await execute(
            `UPDATE jobs SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        // Fetch updated job
        const job = await queryOne(
            `SELECT j.*, c.name as client_name
             FROM jobs j
             LEFT JOIN clients c ON j.client_id = c.id
             WHERE j.id = ?`,
            [id]
        );

        res.json(mapRowToJob(job));
    } catch (error) {
        logger.error('Error updating job', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update job' });
    }
}

/**
 * DELETE /api/jobs/:id - Delete job
 */
export async function deleteJob(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Clean up related records before deleting the job
        await execute('DELETE FROM pbom_items WHERE job_id = ?', [id]);
        await execute('DELETE FROM bom_items WHERE job_id = ?', [id]);
        await execute('DELETE FROM job_workflow_progress WHERE job_id = ?', [id]);
        await execute('DELETE FROM job_materials WHERE job_id = ?', [id]);
        await execute('DELETE FROM job_labor WHERE job_id = ?', [id]);
        await execute('DELETE FROM jobs WHERE id = ?', [id]);

        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting job', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete job' });
    }
}

/**
 * GET /api/jobs/:id/workflow - Get workflow progress
 */
export async function getJobWorkflow(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const workflowProgress = await query(
            `SELECT jwp.*, ws.name as stage_name, ws.color as stage_color, ws.display_order as stage_order
             FROM job_workflow_progress jwp
             JOIN workflow_stages ws ON jwp.stage_id = ws.id
             WHERE jwp.job_id = ?
             ORDER BY ws.display_order`,
            [id]
        );

        res.json(workflowProgress);
    } catch (error) {
        logger.error('Error fetching workflow', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch workflow' });
    }
}

/**
 * PUT /api/jobs/:id/workflow/:stageId - Update workflow stage status
 */
export async function updateWorkflowStage(req: Request, res: Response): Promise<void> {
    try {
        const { id, stageId } = req.params;
        const { status, assignee, notes }: UpdateWorkflowStageRequest = req.body;

        let sql = 'UPDATE job_workflow_progress SET status = ?, updated_at = NOW()';
        const params: any[] = [status];

        // Set timestamps based on status
        if (status === 'In Progress' || status === 'Blocked') {
            sql += ', started_at = COALESCE(started_at, NOW())';
        } else if (status === 'Completed') {
            sql += ', started_at = COALESCE(started_at, NOW()), completed_at = NOW()';
        } else if (status === 'Not Started') {
            sql += ', started_at = NULL, completed_at = NULL';
        }

        if (assignee !== undefined) {
            sql += ', assignee = ?';
            params.push(assignee);
        }

        if (notes !== undefined) {
            sql += ', notes = ?';
            params.push(notes);
        }

        sql += ' WHERE job_id = ? AND stage_id = ?';
        params.push(id, stageId);

        await execute(sql, params);

        // Auto-generate schedule entries when Production starts
        if (status === 'In Progress') {
            const stage = await queryOne<{ name: string }>(
                'SELECT name FROM workflow_stages WHERE id = ?',
                [stageId]
            );
            if (stage?.name === 'Production') {
                await generateEntriesForJob(parseInt(id));
            }
        }

        // Fetch updated workflow progress
        const updated = await queryOne(
            `SELECT jwp.*, ws.name as stage_name, ws.color as stage_color
             FROM job_workflow_progress jwp
             JOIN workflow_stages ws ON jwp.stage_id = ws.id
             WHERE jwp.job_id = ? AND jwp.stage_id = ?`,
            [id, stageId]
        );

        res.json(updated);
    } catch (error) {
        logger.error('Error updating workflow stage', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update workflow stage' });
    }
}

/**
 * GET /api/jobs/:id/materials - Get job materials
 */
export async function getJobMaterials(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const materials = await query(
            'SELECT * FROM job_materials WHERE job_id = ? ORDER BY created_at DESC',
            [id]
        );

        res.json(materials);
    } catch (error) {
        logger.error('Error fetching materials', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch materials' });
    }
}

/**
 * POST /api/jobs/:id/materials - Add material to job
 */
export async function createMaterial(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const material: CreateMaterialRequest = req.body;

        const result = await execute(
            `INSERT INTO job_materials (job_id, material_name, quantity, unit, status, cost, supplier, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                material.materialName,
                material.quantity,
                material.unit,
                material.status || 'Needed',
                material.cost || null,
                material.supplier || null,
                material.notes || null
            ]
        );

        const created = await queryOne(
            'SELECT * FROM job_materials WHERE id = ?',
            [result.lastID]
        );

        res.status(201).json(created);
    } catch (error) {
        logger.error('Error creating material', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create material' });
    }
}

/**
 * PUT /api/jobs/:id/materials/:materialId - Update material
 */
export async function updateMaterial(req: Request, res: Response): Promise<void> {
    try {
        const { id, materialId } = req.params;
        const updates: UpdateMaterialRequest = req.body;

        const allowedFields = ['material_name', 'quantity', 'unit', 'status', 'cost', 'supplier', 'notes'];
        const setClause: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                setClause.push(`${snakeKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClause.push('updated_at = NOW()');
        params.push(materialId, id);

        await execute(
            `UPDATE job_materials SET ${setClause.join(', ')} WHERE id = ? AND job_id = ?`,
            params
        );

        const updated = await queryOne(
            'SELECT * FROM job_materials WHERE id = ?',
            [materialId]
        );

        res.json(updated);
    } catch (error) {
        logger.error('Error updating material', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update material' });
    }
}

/**
 * DELETE /api/jobs/:id/materials/:materialId - Delete material
 */
export async function deleteMaterial(req: Request, res: Response): Promise<void> {
    try {
        const { materialId } = req.params;

        await execute('DELETE FROM job_materials WHERE id = ?', [materialId]);

        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting material', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete material' });
    }
}

/**
 * GET /api/jobs/:id/labor - Get job labor entries
 */
export async function getJobLabor(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const labor = await query(
            `SELECT jl.*, ws.name as stage_name
             FROM job_labor jl
             LEFT JOIN workflow_stages ws ON jl.stage_id = ws.id
             WHERE jl.job_id = ?
             ORDER BY jl.date DESC, jl.created_at DESC`,
            [id]
        );

        res.json(labor);
    } catch (error) {
        logger.error('Error fetching labor', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch labor' });
    }
}

/**
 * POST /api/jobs/:id/labor - Add labor entry
 */
export async function createLabor(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const labor: CreateLaborRequest = req.body;

        const result = await execute(
            `INSERT INTO job_labor (job_id, stage_id, employee_name, hours, date, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
                id,
                labor.stageId || null,
                labor.employeeName,
                labor.hours,
                labor.date,
                labor.notes || null
            ]
        );

        const created = await queryOne(
            `SELECT jl.*, ws.name as stage_name
             FROM job_labor jl
             LEFT JOIN workflow_stages ws ON jl.stage_id = ws.id
             WHERE jl.id = ?`,
            [result.lastID]
        );

        res.status(201).json(created);
    } catch (error) {
        logger.error('Error creating labor', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create labor' });
    }
}

/**
 * DELETE /api/jobs/:id/labor/:laborId - Delete labor entry
 */
export async function deleteLabor(req: Request, res: Response): Promise<void> {
    try {
        const { id, laborId } = req.params;

        await execute('DELETE FROM job_labor WHERE id = ?', [laborId]);

        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting labor', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete labor' });
    }
}
