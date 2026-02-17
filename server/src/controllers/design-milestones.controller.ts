import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import { autoCompleteStage } from './jobs.controller';

export interface DesignMilestone {
    id: number;
    jobId: number;
    milestoneName: string;
    status: 'Not Started' | 'In Progress' | 'Completed';
    completedDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
}

/**
 * GET /api/jobs/:jobId/design-milestones - Get all design milestones for a job
 */
export async function getDesignMilestones(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        const rows = await query(
            `SELECT * FROM design_milestones WHERE job_id = ? ORDER BY id`,
            [jobId]
        );

        const milestones = rows.map((row: any) => ({
            id: row.id,
            jobId: row.job_id,
            milestoneName: row.milestone_name,
            status: row.status,
            targetDate: row.target_date,
            completedDate: row.completed_date,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        res.json(milestones);
    } catch (error) {
        console.error('Error fetching design milestones:', error);
        res.status(500).json({ error: 'Failed to fetch design milestones' });
    }
}

/**
 * POST /api/jobs/:jobId/design-milestones - Create or initialize design milestones
 */
export async function initializeDesignMilestones(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Check if milestones already exist
        const existing = await query(
            'SELECT id FROM design_milestones WHERE job_id = ? LIMIT 1',
            [jobId]
        );

        if (existing.length > 0) {
            res.status(400).json({ error: 'Design milestones already initialized for this job' });
            return;
        }

        // Create default milestones
        const defaultMilestones = [
            'Concept',
            'Initial Design',
            'Design Review',
            'Revision',
            'Final Design'
        ];

        for (const milestoneName of defaultMilestones) {
            await execute(
                `INSERT INTO design_milestones (job_id, milestone_name, status)
                 VALUES (?, ?, 'Not Started')`,
                [jobId, milestoneName]
            );
        }

        // Fetch and return the created milestones
        const rows = await query(
            'SELECT * FROM design_milestones WHERE job_id = ? ORDER BY id',
            [jobId]
        );

        const milestones = rows.map((row: any) => ({
            id: row.id,
            jobId: row.job_id,
            milestoneName: row.milestone_name,
            status: row.status,
            targetDate: row.target_date,
            completedDate: row.completed_date,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        res.status(201).json(milestones);
    } catch (error) {
        console.error('Error initializing design milestones:', error);
        res.status(500).json({ error: 'Failed to initialize design milestones' });
    }
}

/**
 * POST /api/jobs/:jobId/design-milestones/single - Create a single custom milestone
 */
export async function createSingleMilestone(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const { milestoneName, targetDate } = req.body;

        if (!milestoneName || !milestoneName.trim()) {
            res.status(400).json({ error: 'Milestone name is required' });
            return;
        }

        const result = await execute(
            `INSERT INTO design_milestones (job_id, milestone_name, status, target_date)
             VALUES (?, ?, 'Not Started', ?)`,
            [jobId, milestoneName.trim(), targetDate || null]
        );

        // Update job status based on milestone progress
        await updateJobStatusBasedOnMilestones(parseInt(jobId));

        const row = await queryOne(
            'SELECT * FROM design_milestones WHERE id = ?',
            [result.lastID]
        );

        if (!row) {
            res.status(500).json({ error: 'Failed to retrieve created milestone' });
            return;
        }

        const milestone = {
            id: row.id,
            jobId: row.job_id,
            milestoneName: row.milestone_name,
            status: row.status,
            targetDate: row.target_date,
            completedDate: row.completed_date,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };

        res.status(201).json(milestone);
    } catch (error) {
        console.error('Error creating milestone:', error);
        res.status(500).json({ error: 'Failed to create milestone' });
    }
}

/**
 * PUT /api/jobs/:jobId/design-milestones/:milestoneId - Update a design milestone
 */
export async function updateDesignMilestone(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, milestoneId } = req.params;
        const { milestoneName, status, targetDate, completedDate, notes } = req.body;

        const updates: string[] = [];
        const params: any[] = [];

        if (milestoneName !== undefined) {
            updates.push('milestone_name = ?');
            params.push(milestoneName);
        }

        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }

        if (targetDate !== undefined) {
            updates.push('target_date = ?');
            params.push(targetDate || null);
        }

        if (completedDate !== undefined) {
            updates.push('completed_date = ?');
            params.push(completedDate || null);
        }

        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes || null);
        }

        if (updates.length === 0) {
            res.status(400).json({ error: 'No fields to update' });
            return;
        }

        updates.push("updated_at = NOW()");
        params.push(milestoneId, jobId);

        const sql = `UPDATE design_milestones SET ${updates.join(', ')} WHERE id = ? AND job_id = ?`;

        console.log('[updateDesignMilestone] SQL:', sql);
        console.log('[updateDesignMilestone] Params:', params);

        await execute(sql, params);

        // Update job status based on milestone progress
        await updateJobStatusBasedOnMilestones(parseInt(jobId));

        // Auto-complete Engineering stage if all milestones are now Completed
        const allMilestones = await query(
            'SELECT status FROM design_milestones WHERE job_id = ?',
            [jobId]
        );
        if (allMilestones.length > 0 && allMilestones.every((m: any) => m.status === 'Completed')) {
            await autoCompleteStage(parseInt(jobId), 'Engineering');
        }

        // Fetch and return updated milestone
        const row = await queryOne(
            'SELECT * FROM design_milestones WHERE id = ? AND job_id = ?',
            [milestoneId, jobId]
        );

        if (!row) {
            res.status(404).json({ error: 'Design milestone not found' });
            return;
        }

        const milestone = {
            id: row.id,
            jobId: row.job_id,
            milestoneName: row.milestone_name,
            status: row.status,
            targetDate: row.target_date,
            completedDate: row.completed_date,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        };

        res.json(milestone);
    } catch (error) {
        console.error('Error updating design milestone:', error);
        res.status(500).json({ error: 'Failed to update design milestone' });
    }
}

/**
 * DELETE /api/jobs/:jobId/design-milestones/:milestoneId - Delete a design milestone
 */
export async function deleteDesignMilestone(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, milestoneId } = req.params;

        await execute(
            'DELETE FROM design_milestones WHERE id = ? AND job_id = ?',
            [milestoneId, jobId]
        );

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting design milestone:', error);
        res.status(500).json({ error: 'Failed to delete design milestone' });
    }
}

/**
 * Helper function to update job status based on milestone progress
 */
async function updateJobStatusBasedOnMilestones(jobId: number): Promise<void> {
    try {
        // Get all milestones for the job
        const milestones = await query(
            'SELECT status FROM design_milestones WHERE job_id = ?',
            [jobId]
        );

        if (milestones.length === 0) {
            // No milestones, keep job as 'Active' (or whatever it currently is)
            return;
        }

        const hasInProgress = milestones.some((m: any) => m.status === 'In Progress');
        const hasCompleted = milestones.some((m: any) => m.status === 'Completed');
        const allCompleted = milestones.every((m: any) => m.status === 'Completed');

        // Update job status based on milestone progress
        let newJobStatus: string;
        if (allCompleted) {
            newJobStatus = 'Completed';
        } else if (hasInProgress || hasCompleted) {
            newJobStatus = 'Active'; // Job is in progress
        } else {
            newJobStatus = 'Active'; // Job has milestones but none started yet
        }

        await execute(
            'UPDATE jobs SET updated_at = NOW() WHERE id = ?',
            [jobId]
        );

        console.log(`[updateJobStatusBasedOnMilestones] Job ${jobId} milestone progress updated`);
    } catch (error) {
        console.error('Error updating job status based on milestones:', error);
    }
}
