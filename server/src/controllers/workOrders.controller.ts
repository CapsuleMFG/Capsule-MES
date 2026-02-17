import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { WorkOrder, CreateWorkOrderRequest, UpdateWorkOrderRequest } from '../../../shared/types';

/**
 * Convert database row to WorkOrder object
 */
function mapRowToWorkOrder(row: any): WorkOrder {
    return {
        id: row.id,
        jobId: row.job_id,
        woNumber: row.wo_number,
        status: row.status,
        description: row.description,
        createdBy: row.created_by,
        releasedDate: row.released_date,
        notes: row.notes,
        machineType: row.machine_type,
        isRecut: !!row.is_recut,
        productionStatus: row.production_status || 'Not Sent',
        productionPriority: row.production_priority,
        assignedMachineId: row.assigned_machine_id,
        assignedMachineName: row.assigned_machine_name,
        sentToProductionAt: row.sent_to_production_at,
        assignedAt: row.assigned_at,
        productionStartedAt: row.production_started_at,
        productionCompletedAt: row.production_completed_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * Generate next WO number for the current year
 */
async function generateWoNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `WO-${year}-`;

    const lastWo = await queryOne(
        `SELECT wo_number FROM work_orders
         WHERE wo_number LIKE ?
         ORDER BY wo_number DESC LIMIT 1`,
        [`${prefix}%`]
    );

    let nextNumber = 1;
    if (lastWo) {
        const match = lastWo.wo_number.match(/WO-\d{4}-(\d{3})/);
        if (match) {
            nextNumber = parseInt(match[1], 10) + 1;
        }
    }

    return `${prefix}${String(nextNumber).padStart(3, '0')}`;
}

/**
 * GET /api/jobs/:jobId/work-orders - List all work orders for a job
 * Includes BOM items for each work order
 */
export async function getWorkOrders(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const rows = await query(
            `SELECT wo.*, m.name as assigned_machine_name
             FROM work_orders wo
             LEFT JOIN machines m ON wo.assigned_machine_id = m.id
             WHERE wo.job_id = ?
             ORDER BY wo.created_at DESC`,
            [jobId]
        );
        const workOrders = rows.map(mapRowToWorkOrder);

        // Note: BOM items are now job-level, not work-order-level
        // They can be fetched separately via /api/jobs/:jobId/bom

        res.json(workOrders);
    } catch (error) {
        console.error('Error fetching work orders:', error);
        res.status(500).json({ error: 'Failed to fetch work orders' });
    }
}

/**
 * GET /api/jobs/:jobId/work-orders/:woId - Get a specific work order
 */
export async function getWorkOrder(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId } = req.params;
        const row = await queryOne(
            `SELECT wo.*, m.name as assigned_machine_name
             FROM work_orders wo
             LEFT JOIN machines m ON wo.assigned_machine_id = m.id
             WHERE wo.id = ? AND wo.job_id = ?`,
            [woId, jobId]
        );

        if (!row) {
            res.status(404).json({ error: 'Work order not found' });
            return;
        }

        res.json(mapRowToWorkOrder(row));
    } catch (error) {
        console.error('Error fetching work order:', error);
        res.status(500).json({ error: 'Failed to fetch work order' });
    }
}

/**
 * POST /api/jobs/:jobId/work-orders - Create a new work order
 */
export async function createWorkOrder(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const woData: CreateWorkOrderRequest = req.body;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Generate WO number
        const woNumber = await generateWoNumber();

        // Extract machine name from notes and look up its type
        let machineType = null;
        if (woData.notes) {
            const match = woData.notes.match(/Machine:\s*(.+)/);
            if (match) {
                const machineName = match[1].trim();
                const machine = await queryOne('SELECT type FROM machines WHERE name = ?', [machineName]);
                if (machine) {
                    machineType = machine.type;
                }
            }
        }

        const result = await execute(
            `INSERT INTO work_orders (job_id, wo_number, description, created_by, notes, machine_type, is_recut)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                jobId,
                woNumber,
                woData.description,
                woData.createdBy,
                woData.notes,
                machineType,
                woData.isRecut ? 1 : 0,
            ]
        );

        console.log('Created work order with ID:', result.lastID);

        const newWo = await queryOne(
            `SELECT wo.*, m.name as assigned_machine_name
             FROM work_orders wo
             LEFT JOIN machines m ON wo.assigned_machine_id = m.id
             WHERE wo.id = ?`,
            [result.lastID]
        );

        if (!newWo) {
            console.error('Failed to retrieve newly created work order. ID:', result.lastID);
            res.status(500).json({ error: 'Work order created but failed to retrieve it' });
            return;
        }

        res.status(201).json(mapRowToWorkOrder(newWo));
    } catch (error) {
        console.error('Error creating work order:', error);
        res.status(500).json({ error: 'Failed to create work order' });
    }
}

/**
 * PUT /api/jobs/:jobId/work-orders/:woId - Update a work order
 */
export async function updateWorkOrder(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId } = req.params;
        const updates: UpdateWorkOrderRequest = req.body;

        // Check if work order exists
        const existing = await queryOne(
            'SELECT * FROM work_orders WHERE id = ? AND job_id = ?',
            [woId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'Work order not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            values.push(updates.status);
        }
        if (updates.description !== undefined) {
            setClauses.push('description = ?');
            values.push(updates.description);
        }
        if (updates.createdBy !== undefined) {
            setClauses.push('created_by = ?');
            values.push(updates.createdBy);
        }
        if (updates.releasedDate !== undefined) {
            setClauses.push('released_date = ?');
            values.push(updates.releasedDate);
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
        values.push(woId, jobId);

        await execute(
            `UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = ? AND job_id = ?`,
            values
        );

        const updated = await queryOne('SELECT * FROM work_orders WHERE id = ?', [woId]);
        res.json(mapRowToWorkOrder(updated));
    } catch (error) {
        console.error('Error updating work order:', error);
        res.status(500).json({ error: 'Failed to update work order' });
    }
}

/**
 * DELETE /api/jobs/:jobId/work-orders/:woId - Delete a work order
 */
export async function deleteWorkOrder(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId } = req.params;

        const existing = await queryOne(
            'SELECT * FROM work_orders WHERE id = ? AND job_id = ?',
            [woId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'Work order not found' });
            return;
        }

        await execute('DELETE FROM work_orders WHERE id = ?', [woId]);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting work order:', error);
        res.status(500).json({ error: 'Failed to delete work order' });
    }
}
