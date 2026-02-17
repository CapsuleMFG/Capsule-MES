import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { PurchaseOrder, PurchaseOrderJob } from '../../../shared/types';
import { autoCompleteStage } from './jobs.controller';

function mapRowToPurchaseOrder(row: any): PurchaseOrder {
    return {
        id: row.id,
        poNumber: row.po_number,
        inventoryId: row.inventory_id,
        description: row.description,
        qtyOrdered: row.qty_ordered,
        qtyReceived: row.qty_received,
        status: row.status,
        expectedReceiveDate: row.expected_receive_date,
        vendor: row.vendor,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/purchase-orders — list all POs with linked job breakdown
 */
export async function getPurchaseOrders(req: Request, res: Response): Promise<void> {
    try {
        const poRows = await query(
            `SELECT po.*
             FROM purchase_orders po
             ORDER BY
               CASE WHEN po.expected_receive_date IS NULL THEN 1 ELSE 0 END,
               po.expected_receive_date ASC,
               po.created_at DESC`,
            []
        );

        const result: PurchaseOrder[] = [];

        for (const poRow of poRows) {
            const po = mapRowToPurchaseOrder(poRow);

            // Get linked PBOM items with job info
            const linkedRows = await query(
                `SELECT p.id AS pbom_item_id, p.job_id, p.qty_ordered, p.qty_received,
                        j.job_number, COALESCE(c.name, 'No Client') AS client_name
                 FROM pbom_items p
                 JOIN jobs j ON p.job_id = j.id
                 LEFT JOIN clients c ON j.client_id = c.id
                 WHERE p.purchase_order_id = ?
                 ORDER BY j.sc_priority ASC, j.created_at ASC`,
                [po.id]
            );

            po.linkedJobs = linkedRows.map((r: any) => ({
                jobId: r.job_id,
                jobNumber: r.job_number,
                clientName: r.client_name,
                pbomItemId: r.pbom_item_id,
                qtyOrdered: r.qty_ordered,
                qtyReceived: r.qty_received,
            }));

            result.push(po);
        }

        // Also get standalone ordered PBOM items (no purchase_order_id)
        const standaloneRows = await query(
            `SELECT p.*,
                    j.job_number, j.description AS job_description, j.priority,
                    COALESCE(c.name, 'No Client') AS client_name
             FROM pbom_items p
             JOIN jobs j ON p.job_id = j.id
             LEFT JOIN clients c ON j.client_id = c.id
             WHERE p.sent_to_sc = TRUE
               AND p.purchase_order_id IS NULL
               AND (p.status = 'Ordered' OR (p.status = 'Received' AND p.qty_received < p.qty_ordered))
             ORDER BY
               CASE WHEN p.expected_receive_date IS NULL THEN 1 ELSE 0 END,
               p.expected_receive_date ASC`,
            []
        );

        // Convert standalone PBOM items to pseudo-POs for uniform display
        for (const row of standaloneRows) {
            result.push({
                id: -row.id, // negative ID to distinguish from real POs
                poNumber: row.po_number,
                inventoryId: row.global_inventory_id,
                description: row.description,
                qtyOrdered: row.qty_ordered,
                qtyReceived: row.qty_received,
                status: row.qty_received >= row.qty_ordered ? 'Received' :
                        row.qty_received > 0 ? 'Partial' : 'Ordered',
                expectedReceiveDate: row.expected_receive_date,
                vendor: row.mfr_vendor,
                notes: row.notes,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
                linkedJobs: [{
                    jobId: row.job_id,
                    jobNumber: row.job_number,
                    clientName: row.client_name,
                    pbomItemId: row.id,
                    qtyOrdered: row.qty_ordered,
                    qtyReceived: row.qty_received,
                }],
            });
        }

        res.json(result);
    } catch (error) {
        console.error('Error fetching purchase orders:', error);
        res.status(500).json({ error: 'Failed to fetch purchase orders' });
    }
}

/**
 * PUT /api/purchase-orders/:id — update PO fields
 * Handles both real POs (positive id) and standalone PBOM items (negative id)
 */
export async function updatePurchaseOrder(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { poNumber, expectedReceiveDate, vendor, notes } = req.body;

        if (id > 0) {
            // Real purchase order
            const setClauses: string[] = [];
            const values: any[] = [];

            if (poNumber !== undefined) { setClauses.push('po_number = ?'); values.push(poNumber); }
            if (expectedReceiveDate !== undefined) { setClauses.push('expected_receive_date = ?'); values.push(expectedReceiveDate); }
            if (vendor !== undefined) { setClauses.push('vendor = ?'); values.push(vendor); }
            if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes); }

            if (setClauses.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            setClauses.push("updated_at = NOW()");
            values.push(id);

            await execute(
                `UPDATE purchase_orders SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );

            // Also propagate PO# to linked PBOM items
            if (poNumber !== undefined) {
                await execute(
                    `UPDATE pbom_items SET po_number = ?, updated_at = NOW() WHERE purchase_order_id = ?`,
                    [poNumber, id]
                );
            }
            if (expectedReceiveDate !== undefined) {
                await execute(
                    `UPDATE pbom_items SET expected_receive_date = ?, updated_at = NOW() WHERE purchase_order_id = ?`,
                    [expectedReceiveDate, id]
                );
            }

            res.json({ message: 'Purchase order updated' });
        } else {
            // Standalone PBOM item (id is negative of pbom_item id)
            const pbomId = -id;
            const updateData: any = {};
            if (poNumber !== undefined) updateData.poNumber = poNumber;
            if (expectedReceiveDate !== undefined) updateData.expectedReceiveDate = expectedReceiveDate;
            if (vendor !== undefined) updateData.mfrVendor = vendor;
            if (notes !== undefined) updateData.notes = notes;

            const setClauses: string[] = [];
            const values: any[] = [];
            if (poNumber !== undefined) { setClauses.push('po_number = ?'); values.push(poNumber); }
            if (expectedReceiveDate !== undefined) { setClauses.push('expected_receive_date = ?'); values.push(expectedReceiveDate); }
            if (vendor !== undefined) { setClauses.push('mfr_vendor = ?'); values.push(vendor); }
            if (notes !== undefined) { setClauses.push('notes = ?'); values.push(notes); }

            if (setClauses.length === 0) {
                res.status(400).json({ error: 'No fields to update' });
                return;
            }

            setClauses.push("updated_at = NOW()");
            values.push(pbomId);

            await execute(
                `UPDATE pbom_items SET ${setClauses.join(', ')} WHERE id = ?`,
                values
            );

            res.json({ message: 'Order updated' });
        }
    } catch (error) {
        console.error('Error updating purchase order:', error);
        res.status(500).json({ error: 'Failed to update purchase order' });
    }
}

/**
 * POST /api/purchase-orders/:id/receive — receive quantity against a PO
 * Distributes to linked PBOM items in SC priority order and updates inventory
 */
export async function receivePurchaseOrder(req: Request, res: Response): Promise<void> {
    try {
        const id = parseInt(req.params.id);
        const { qtyReceived } = req.body;

        if (!qtyReceived || qtyReceived <= 0) {
            res.status(400).json({ error: 'Quantity received must be greater than 0' });
            return;
        }

        if (id > 0) {
            // Real purchase order
            const po = await queryOne('SELECT * FROM purchase_orders WHERE id = ?', [id]);
            if (!po) {
                res.status(404).json({ error: 'Purchase order not found' });
                return;
            }

            const newTotalReceived = po.qty_received + qtyReceived;
            const newStatus = newTotalReceived >= po.qty_ordered ? 'Received' :
                              newTotalReceived > 0 ? 'Partial' : 'Ordered';

            // Update PO
            await execute(
                `UPDATE purchase_orders SET qty_received = ?, status = ?, updated_at = NOW() WHERE id = ?`,
                [newTotalReceived, newStatus, id]
            );

            // Distribute to linked PBOM items in SC priority order
            const linkedItems = await query(
                `SELECT p.id, p.qty_ordered, p.qty_received, p.job_id
                 FROM pbom_items p
                 JOIN jobs j ON p.job_id = j.id
                 WHERE p.purchase_order_id = ?
                 ORDER BY j.sc_priority ASC, j.created_at ASC`,
                [id]
            );

            let remaining = qtyReceived;
            for (const item of linkedItems) {
                if (remaining <= 0) break;
                const canReceive = item.qty_ordered - item.qty_received;
                if (canReceive <= 0) continue;
                const toReceive = Math.min(canReceive, remaining);
                const newItemReceived = item.qty_received + toReceive;
                const itemStatus = newItemReceived >= item.qty_ordered ? 'Received' : 'Ordered';

                await execute(
                    `UPDATE pbom_items SET qty_received = ?, status = ?, updated_at = NOW() WHERE id = ?`,
                    [newItemReceived, itemStatus, item.id]
                );

                // Update allocation to match received
                await execute(
                    `UPDATE pbom_items SET qty_allocated = GREATEST(qty_allocated, ?) WHERE id = ?`,
                    [newItemReceived, item.id]
                );

                remaining -= toReceive;
            }

            // Update inventory quantity_on_hand
            if (po.inventory_id) {
                await execute(
                    `UPDATE global_inventory SET quantity_on_hand = quantity_on_hand + ?, last_restock_date = CURRENT_DATE, updated_at = NOW() WHERE id = ?`,
                    [qtyReceived, po.inventory_id]
                );
            }

            // Auto-complete Materials stage for each affected job if all PBOM items received
            const affectedJobIds = [...new Set(linkedItems.map((item: any) => item.job_id))];
            for (const affectedJobId of affectedJobIds) {
                const pbomCheck = await queryOne<{ total: number; received: number }>(
                    `SELECT COUNT(*) as total,
                            SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received
                     FROM pbom_items WHERE job_id = ? AND sent_to_sc = TRUE`,
                    [affectedJobId]
                );
                if (pbomCheck && pbomCheck.total > 0 && pbomCheck.total === pbomCheck.received) {
                    await autoCompleteStage(affectedJobId, 'Materials');
                }
            }

            res.json({
                message: `Received ${qtyReceived} units`,
                newTotalReceived,
                status: newStatus,
            });
        } else {
            // Standalone PBOM item
            const pbomId = -id;
            const item = await queryOne('SELECT * FROM pbom_items WHERE id = ?', [pbomId]);
            if (!item) {
                res.status(404).json({ error: 'Order item not found' });
                return;
            }

            const newTotal = item.qty_received + qtyReceived;
            const status = newTotal >= item.qty_ordered ? 'Received' : 'Ordered';

            await execute(
                `UPDATE pbom_items SET qty_received = ?, status = ?, updated_at = NOW() WHERE id = ?`,
                [newTotal, status, pbomId]
            );

            // Update allocation
            await execute(
                `UPDATE pbom_items SET qty_allocated = GREATEST(qty_allocated, ?) WHERE id = ?`,
                [newTotal, pbomId]
            );

            // Update inventory if linked
            if (item.global_inventory_id) {
                await execute(
                    `UPDATE global_inventory SET quantity_on_hand = quantity_on_hand + ?, last_restock_date = CURRENT_DATE, updated_at = NOW() WHERE id = ?`,
                    [qtyReceived, item.global_inventory_id]
                );
            }

            // Auto-complete Materials stage if all PBOM items for this job are received
            const pbomCheck = await queryOne<{ total: number; received: number }>(
                `SELECT COUNT(*) as total,
                        SUM(CASE WHEN status = 'Received' THEN 1 ELSE 0 END) as received
                 FROM pbom_items WHERE job_id = ? AND sent_to_sc = TRUE`,
                [item.job_id]
            );
            if (pbomCheck && pbomCheck.total > 0 && pbomCheck.total === pbomCheck.received) {
                await autoCompleteStage(item.job_id, 'Materials');
            }

            res.json({
                message: `Received ${qtyReceived} units`,
                newTotalReceived: newTotal,
                status,
            });
        }
    } catch (error) {
        console.error('Error receiving purchase order:', error);
        res.status(500).json({ error: 'Failed to receive purchase order' });
    }
}
