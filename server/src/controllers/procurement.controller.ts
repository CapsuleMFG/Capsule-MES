import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { JobProcurement, CreateProcurementRequest, UpdateProcurementRequest } from '../../../shared/types';
import { logger } from '../lib/logger';

/**
 * Convert database row to JobProcurement object
 */
function mapRowToProcurement(row: any): JobProcurement {
    return {
        id: row.id,
        jobId: row.job_id,
        bomItemId: row.bom_item_id,
        globalInventoryId: row.global_inventory_id,
        quantityNeeded: row.quantity_needed,
        quantityAllocated: row.quantity_allocated,
        quantityReceived: row.quantity_received,
        status: row.status,
        poNumber: row.po_number,
        supplierName: row.supplier_name,
        expectedDeliveryDate: row.expected_delivery_date,
        actualDeliveryDate: row.actual_delivery_date,
        cost: row.cost,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/jobs/:jobId/procurement - List all procurement items for a job
 */
export async function getProcurementItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const rows = await query(
            'SELECT * FROM job_procurement WHERE job_id = ? ORDER BY created_at DESC',
            [jobId]
        );
        const items = rows.map(mapRowToProcurement);

        res.json(items);
    } catch (error) {
        logger.error('Error fetching procurement items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch procurement items' });
    }
}

/**
 * POST /api/jobs/:jobId/procurement - Create a new procurement item
 * Automatically matches to global inventory by part number if BOM item is provided
 */
export async function createProcurementItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const procData: CreateProcurementRequest = req.body;

        if (!procData.quantityNeeded) {
            res.status(400).json({ error: 'Quantity needed is required' });
            return;
        }

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        let globalInventoryId = null;
        let supplierName = procData.supplierName;
        let cost = procData.cost;

        // If BOM item is provided, try to match with global inventory
        if (procData.bomItemId) {
            const bomItem = await queryOne(
                'SELECT part_number, supplier_name, unit_cost FROM bom_items WHERE id = ?',
                [procData.bomItemId]
            );

            if (bomItem) {
                // Try to find matching inventory item
                const inventoryItem = await queryOne(
                    'SELECT id, unit_cost, supplier_name FROM global_inventory WHERE part_number = ?',
                    [bomItem.part_number]
                );

                if (inventoryItem) {
                    globalInventoryId = inventoryItem.id;
                    // Pre-fill from inventory if not provided
                    if (!cost) cost = inventoryItem.unit_cost;
                    if (!supplierName) supplierName = inventoryItem.supplier_name;
                } else {
                    // Pre-fill from BOM if not matched to inventory
                    if (!cost) cost = bomItem.unit_cost;
                    if (!supplierName) supplierName = bomItem.supplier_name;
                }
            }
        }

        const result = await execute(
            `INSERT INTO job_procurement (job_id, bom_item_id, global_inventory_id, quantity_needed, supplier_name, expected_delivery_date, cost, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                jobId,
                procData.bomItemId,
                globalInventoryId,
                procData.quantityNeeded,
                supplierName,
                procData.expectedDeliveryDate,
                cost,
                procData.notes,
            ]
        );

        const newItem = await queryOne('SELECT * FROM job_procurement WHERE id = ?', [result.lastID]);
        res.status(201).json(mapRowToProcurement(newItem));
    } catch (error) {
        logger.error('Error creating procurement item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create procurement item' });
    }
}

/**
 * PUT /api/jobs/:jobId/procurement/:procId - Update a procurement item
 * When status changes to "Received", updates global inventory quantity
 */
export async function updateProcurementItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, procId } = req.params;
        const updates: UpdateProcurementRequest = req.body;

        // Check if procurement item exists
        const existing = await queryOne(
            'SELECT * FROM job_procurement WHERE id = ? AND job_id = ?',
            [procId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'Procurement item not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.quantityNeeded !== undefined) {
            setClauses.push('quantity_needed = ?');
            values.push(updates.quantityNeeded);
        }
        if (updates.quantityAllocated !== undefined) {
            setClauses.push('quantity_allocated = ?');
            values.push(updates.quantityAllocated);
        }
        if (updates.quantityReceived !== undefined) {
            setClauses.push('quantity_received = ?');
            values.push(updates.quantityReceived);
        }
        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            values.push(updates.status);

            // If status is being set to "Received", update inventory and set actual delivery date
            if (updates.status === 'Received' && existing.global_inventory_id) {
                const quantityReceived = updates.quantityReceived !== undefined
                    ? updates.quantityReceived
                    : existing.quantity_received;

                if (quantityReceived > 0) {
                    await execute(
                        `UPDATE global_inventory
                         SET quantity_on_hand = quantity_on_hand + ?,
                             last_restock_date = CURRENT_DATE,
                             updated_at = NOW()
                         WHERE id = ?`,
                        [quantityReceived, existing.global_inventory_id]
                    );
                }

                // Set actual delivery date if not already set
                if (!existing.actual_delivery_date && !updates.actualDeliveryDate) {
                    setClauses.push('actual_delivery_date = date(\'now\')');
                }
            }
        }
        if (updates.poNumber !== undefined) {
            setClauses.push('po_number = ?');
            values.push(updates.poNumber);
        }
        if (updates.supplierName !== undefined) {
            setClauses.push('supplier_name = ?');
            values.push(updates.supplierName);
        }
        if (updates.expectedDeliveryDate !== undefined) {
            setClauses.push('expected_delivery_date = ?');
            values.push(updates.expectedDeliveryDate);
        }
        if (updates.actualDeliveryDate !== undefined) {
            setClauses.push('actual_delivery_date = ?');
            values.push(updates.actualDeliveryDate);
        }
        if (updates.cost !== undefined) {
            setClauses.push('cost = ?');
            values.push(updates.cost);
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
        values.push(procId, jobId);

        await execute(
            `UPDATE job_procurement SET ${setClauses.join(', ')} WHERE id = ? AND job_id = ?`,
            values
        );

        const updated = await queryOne('SELECT * FROM job_procurement WHERE id = ?', [procId]);
        res.json(mapRowToProcurement(updated));
    } catch (error) {
        logger.error('Error updating procurement item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update procurement item' });
    }
}

/**
 * DELETE /api/jobs/:jobId/procurement/:procId - Delete a procurement item
 */
export async function deleteProcurementItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, procId } = req.params;

        const existing = await queryOne(
            'SELECT * FROM job_procurement WHERE id = ? AND job_id = ?',
            [procId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'Procurement item not found' });
            return;
        }

        await execute('DELETE FROM job_procurement WHERE id = ?', [procId]);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting procurement item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete procurement item' });
    }
}
