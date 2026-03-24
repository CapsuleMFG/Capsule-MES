import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';
import type { DashboardMetrics, Job } from '../../../shared/types';
import { logger } from '../lib/logger';

/**
 * GET /api/dashboard/metrics - Get dashboard metrics
 */
export async function getDashboardMetrics(req: Request, res: Response): Promise<void> {
    try {
        // Get job counts based on milestone status
        const totalJobsResult = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs WHERE status = 'Active'`
        );
        const totalJobs = totalJobsResult?.count || 0;

        // Get jobs with in-progress milestones
        const inProgressJobsResult = await queryOne<{ count: number }>(
            `SELECT COUNT(DISTINCT j.id) as count
             FROM jobs j
             INNER JOIN design_milestones dm ON j.id = dm.job_id
             WHERE j.status = 'Active' AND dm.status = 'In Progress'`
        );
        const inProgressJobs = inProgressJobsResult?.count || 0;

        // Get jobs with not started milestones (no in-progress or completed milestones)
        const notStartedJobsResult = await queryOne<{ count: number }>(
            `SELECT COUNT(DISTINCT j.id) as count
             FROM jobs j
             LEFT JOIN design_milestones dm ON j.id = dm.job_id
             WHERE j.status = 'Active' 
             AND (dm.id IS NULL OR dm.status = 'Not Started')
             AND j.id NOT IN (
                 SELECT DISTINCT job_id FROM design_milestones 
                 WHERE status IN ('In Progress', 'Completed')
             )`
        );
        const notStartedJobs = notStartedJobsResult?.count || 0;

        // Get critical jobs count
        const criticalJobsResult = await queryOne<{ count: number }>(
            `SELECT COUNT(*) as count FROM jobs WHERE priority = 'Critical' AND status = 'Active'`
        );
        const criticalJobs = criticalJobsResult?.count || 0;

        // Get material issues count (jobs with materials that are not 'Received')
        const materialIssuesResult = await queryOne<{ count: number }>(
            `SELECT COUNT(DISTINCT job_id) as count
             FROM job_materials
             WHERE status IN ('Needed', 'Ordered')
             AND job_id IN (SELECT id FROM jobs WHERE status = 'Active')`
        );
        const materialIssues = materialIssuesResult?.count || 0;

        // Get total labor hours
        const totalLaborResult = await queryOne<{ total: number }>(
            `SELECT COALESCE(SUM(hours), 0) as total FROM job_labor`
        );
        const totalLaborHours = totalLaborResult?.total || 0;

        // Get recent jobs (last 5)
        const recentJobsRows = await query(
            `SELECT j.*, c.name as client_name
             FROM jobs j
             LEFT JOIN clients c ON j.client_id = c.id
             ORDER BY j.created_at DESC
             LIMIT 5`
        );

        const recentJobs: Job[] = recentJobsRows.map((row: any) => ({
            id: row.id,
            jobNumber: row.job_number,
            clientId: row.client_id,
            clientName: row.client_name,
            priority: row.priority,
            status: row.status,
            description: row.description,
            targetDate: row.target_date,
            startDate: row.start_date,
            completedDate: row.completed_date,
            estimatedHours: row.estimated_hours,
            actualHours: row.actual_hours,
            notes: row.notes,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));

        const metrics: DashboardMetrics = {
            activeJobs: totalJobs,
            criticalJobs,
            materialIssues,
            totalLaborHours,
            recentJobs,
            // Add milestone-based counts
            inProgressJobs,
            notStartedJobs,
        };

        res.json(metrics);
    } catch (error) {
        logger.error('Error fetching dashboard metrics', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch dashboard metrics' });
    }
}
