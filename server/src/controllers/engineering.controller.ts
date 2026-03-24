import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { JobEngineering, UpdateEngineeringRequest } from '../../../shared/types';
import { logger } from '../lib/logger';

/**
 * Convert database row to JobEngineering object
 */
function mapRowToEngineering(row: any): JobEngineering {
    return {
        id: row.id,
        jobId: row.job_id,
        status: row.status,
        assignee: row.assignee,
        startedAt: row.started_at,
        completedAt: row.completed_at,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/jobs/:jobId/engineering - Get engineering status for a job
 * Creates a record if one doesn't exist
 */
export async function getEngineeringStatus(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Get or create engineering record
        let row = await queryOne('SELECT * FROM job_engineering WHERE job_id = ?', [jobId]);

        if (!row) {
            // Create default engineering record
            const result = await execute(
                'INSERT INTO job_engineering (job_id) VALUES (?)',
                [jobId]
            );
            row = await queryOne('SELECT * FROM job_engineering WHERE id = ?', [result.lastID]);
        }

        res.json(mapRowToEngineering(row));
    } catch (error) {
        logger.error('Error fetching engineering status', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch engineering status' });
    }
}

/**
 * PUT /api/jobs/:jobId/engineering - Update engineering status for a job
 */
export async function updateEngineeringStatus(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const updates: UpdateEngineeringRequest = req.body;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Get or create engineering record
        let existing = await queryOne('SELECT * FROM job_engineering WHERE job_id = ?', [jobId]);

        if (!existing) {
            const result = await execute(
                'INSERT INTO job_engineering (job_id) VALUES (?)',
                [jobId]
            );
            existing = await queryOne('SELECT * FROM job_engineering WHERE id = ?', [result.lastID]);
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            values.push(updates.status);

            // Auto-set timestamps based on status
            if (updates.status === 'In Progress' && !existing.started_at) {
                setClauses.push('started_at = NOW()');
            }
            if (updates.status === 'Completed' && !existing.completed_at) {
                setClauses.push('completed_at = NOW()');
            }
        }
        if (updates.assignee !== undefined) {
            setClauses.push('assignee = ?');
            values.push(updates.assignee);
        }
        if (updates.startedAt !== undefined) {
            setClauses.push('started_at = ?');
            values.push(updates.startedAt);
        }
        if (updates.completedAt !== undefined) {
            setClauses.push('completed_at = ?');
            values.push(updates.completedAt);
        }
        if (updates.notes !== undefined) {
            setClauses.push('notes = ?');
            values.push(updates.notes);
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClauses.push('updated_at = NOW()');
        values.push(existing.id);

        await execute(
            `UPDATE job_engineering SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        const updated = await queryOne('SELECT * FROM job_engineering WHERE id = ?', [existing.id]);
        res.json(mapRowToEngineering(updated));
    } catch (error) {
        logger.error('Error updating engineering status', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update engineering status' });
    }
}
