import { Request, Response } from 'express';
import { query } from '../models/database';
import type { WorkflowStage } from '../../../shared/types';

/**
 * GET /api/workflow/stages - Get all workflow stages
 */
export async function getWorkflowStages(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query(
            'SELECT * FROM workflow_stages ORDER BY display_order ASC'
        );

        const stages: WorkflowStage[] = rows.map((row: any) => ({
            id: row.id,
            name: row.name,
            displayOrder: row.display_order,
            color: row.color,
            createdAt: row.created_at,
        }));

        res.json(stages);
    } catch (error) {
        console.error('Error fetching workflow stages:', error);
        res.status(500).json({ error: 'Failed to fetch workflow stages' });
    }
}
