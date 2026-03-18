import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { GlobalInventory, CreateInventoryRequest, UpdateInventoryRequest, DemandDetailItem } from '../../../shared/types';

/**
 * Convert database row to GlobalInventory object
 */
function mapRowToInventory(row: any): GlobalInventory {
    return {
        id: row.id,
        partNumber: row.part_number,
        description: row.description,
        quantityOnHand: row.quantity_on_hand,
        unit: row.unit,
        reorderLevel: row.reorder_level,
        reorderQuantity: row.reorder_quantity,
        unitCost: row.unit_cost,
        supplierName: row.supplier_name,
        lastRestockDate: row.last_restock_date,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/inventory - List all inventory items
 */
export async function getInventoryItems(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query(
            `SELECT gi.*,
                COALESCE(alloc.total_allocated, 0) AS total_allocated,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS available_qty,
                COALESCE(demand.total_demand, 0) AS total_demand
            FROM global_inventory gi
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            LEFT JOIN (
                SELECT p.global_inventory_id,
                       SUM(CASE WHEN p.qty_required > p.qty_allocated
                           THEN (p.qty_required - p.qty_allocated) ELSE 0 END) AS total_demand
                FROM pbom_items p
                JOIN jobs j ON p.job_id = j.id
                WHERE p.global_inventory_id IS NOT NULL
                  AND p.sent_to_sc = TRUE
                  AND p.status != 'Received'
                  AND j.status IN ('Active', 'On Hold')
                GROUP BY p.global_inventory_id
            ) demand ON gi.id = demand.global_inventory_id
            ORDER BY gi.part_number ASC`
        );

        const items = rows.map(row => ({
            ...mapRowToInventory(row),
            totalAllocated: row.total_allocated ?? 0,
            availableQty: row.available_qty ?? row.quantity_on_hand,
            totalDemand: row.total_demand ?? 0,
        }));

        res.json(items);
    } catch (error) {
        console.error('Error fetching inventory items:', error);
        res.status(500).json({ error: 'Failed to fetch inventory items' });
    }
}

/**
 * GET /api/inventory/:id - Get inventory item by ID
 */
export async function getInventoryItem(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const row = await queryOne('SELECT * FROM global_inventory WHERE id = ?', [id]);

        if (!row) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        res.json(mapRowToInventory(row));
    } catch (error) {
        console.error('Error fetching inventory item:', error);
        res.status(500).json({ error: 'Failed to fetch inventory item' });
    }
}

/**
 * POST /api/inventory - Create a new inventory item
 */
export async function createInventoryItem(req: Request, res: Response): Promise<void> {
    try {
        const itemData: CreateInventoryRequest = req.body;

        const result = await execute(
            `INSERT INTO global_inventory (part_number, description, quantity_on_hand, unit, reorder_level, reorder_quantity, unit_cost, supplier_name, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                itemData.partNumber ?? null,
                itemData.description,
                itemData.quantityOnHand ?? 0,
                itemData.unit ?? 'EA',
                itemData.reorderLevel ?? null,
                itemData.reorderQuantity ?? null,
                itemData.unitCost ?? null,
                itemData.supplierName ?? null,
                itemData.notes ?? null,
            ]
        );

        const newId = result.lastID;

        // Auto-match unlinked PBOM items that match this new inventory item
        const description = itemData.description;
        const partNumber = itemData.partNumber;

        const unmatchedItems = await query(
            `SELECT id, description, mfr_vendor_part, qty_required
             FROM pbom_items
             WHERE global_inventory_id IS NULL
               AND sent_to_sc = TRUE
               AND (LOWER(TRIM(description)) = LOWER(TRIM(?))
                    OR (mfr_vendor_part IS NOT NULL AND LOWER(TRIM(mfr_vendor_part)) = LOWER(TRIM(?))))`,
            [description, partNumber || '']
        );

        for (const item of unmatchedItems) {
            await execute(
                `UPDATE pbom_items SET global_inventory_id = ?, updated_at = NOW() WHERE id = ?`,
                [newId, item.id]
            );

            // Auto-allocate
            const availRow = await queryOne(
                `SELECT gi.quantity_on_hand - COALESCE(
                    (SELECT SUM(qty_allocated) FROM pbom_items WHERE global_inventory_id = ? AND id != ?), 0
                ) AS available
                FROM global_inventory gi WHERE gi.id = ?`,
                [newId, item.id, newId]
            );
            const available = availRow ? Math.max(0, availRow.available) : 0;
            const toAllocate = Math.min(item.qty_required, available);

            if (toAllocate > 0) {
                await execute(
                    `UPDATE pbom_items SET qty_allocated = ?, updated_at = NOW() WHERE id = ?`,
                    [toAllocate, item.id]
                );
            }
        }

        const newItem = await queryOne(
            `SELECT gi.*,
                COALESCE(alloc.total_allocated, 0) AS total_allocated,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS available_qty
            FROM global_inventory gi
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE gi.id = ?`,
            [newId]
        );
        res.status(201).json({
            ...mapRowToInventory(newItem),
            totalAllocated: newItem.total_allocated ?? 0,
            availableQty: newItem.available_qty ?? newItem.quantity_on_hand,
        });
    } catch (error: any) {
        console.error('Error creating inventory item:', error);
        res.status(500).json({ error: 'Failed to create inventory item' });
    }
}

/**
 * PUT /api/inventory/:id - Update an inventory item
 */
export async function updateInventoryItem(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates: UpdateInventoryRequest = req.body;

        // Check if item exists
        const existing = await queryOne('SELECT * FROM global_inventory WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.partNumber !== undefined) {
            setClauses.push('part_number = ?');
            values.push(updates.partNumber);
        }
        if (updates.description !== undefined) {
            setClauses.push('description = ?');
            values.push(updates.description);
        }
        if (updates.quantityOnHand !== undefined) {
            setClauses.push('quantity_on_hand = ?');
            values.push(updates.quantityOnHand);
        }
        if (updates.unit !== undefined) {
            setClauses.push('unit = ?');
            values.push(updates.unit);
        }
        if (updates.reorderLevel !== undefined) {
            setClauses.push('reorder_level = ?');
            values.push(updates.reorderLevel);
        }
        if (updates.reorderQuantity !== undefined) {
            setClauses.push('reorder_quantity = ?');
            values.push(updates.reorderQuantity);
        }
        if (updates.unitCost !== undefined) {
            setClauses.push('unit_cost = ?');
            values.push(updates.unitCost);
        }
        if (updates.supplierName !== undefined) {
            setClauses.push('supplier_name = ?');
            values.push(updates.supplierName);
        }
        if (updates.lastRestockDate !== undefined) {
            setClauses.push('last_restock_date = ?');
            values.push(updates.lastRestockDate);
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
        values.push(id);

        await execute(
            `UPDATE global_inventory SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        // If description or part number changed, unlink PBOM items that no longer match, then re-match new ones
        if (updates.description !== undefined || updates.partNumber !== undefined) {
            const newDescription = updates.description || existing.description;
            const newPartNumber = updates.partNumber !== undefined ? updates.partNumber : existing.part_number;

            // Unlink PBOM items currently linked to this inventory that no longer match by description OR part number
            await execute(
                `UPDATE pbom_items
                 SET global_inventory_id = NULL, qty_allocated = 0, updated_at = NOW()
                 WHERE global_inventory_id = ?
                   AND LOWER(TRIM(description)) != LOWER(TRIM(?))
                   AND (mfr_vendor_part IS NULL OR LOWER(TRIM(mfr_vendor_part)) != LOWER(TRIM(?)))`,
                [id, newDescription, newPartNumber || '']
            );

            // Find unlinked PBOM items that match the new description or part number
            const unmatchedItems = await query(
                `SELECT id, description, mfr_vendor_part, qty_required
                 FROM pbom_items
                 WHERE global_inventory_id IS NULL
                   AND sent_to_sc = TRUE
                   AND (LOWER(TRIM(description)) = LOWER(TRIM(?))
                        OR (mfr_vendor_part IS NOT NULL AND LOWER(TRIM(mfr_vendor_part)) = LOWER(TRIM(?))))`,
                [newDescription, newPartNumber || '']
            );

            // Link and allocate these items
            for (const item of unmatchedItems) {
                await execute(
                    `UPDATE pbom_items SET global_inventory_id = ?, updated_at = NOW() WHERE id = ?`,
                    [id, item.id]
                );

                // Auto-allocate: calculate available qty and allocate MIN(required, available)
                const availRow = await queryOne(
                    `SELECT gi.quantity_on_hand - COALESCE(
                        (SELECT SUM(qty_allocated) FROM pbom_items WHERE global_inventory_id = ? AND id != ?), 0
                    ) AS available
                    FROM global_inventory gi WHERE gi.id = ?`,
                    [id, item.id, id]
                );
                const available = availRow ? Math.max(0, availRow.available) : 0;
                const toAllocate = Math.min(item.qty_required, available);

                if (toAllocate > 0) {
                    await execute(
                        `UPDATE pbom_items SET qty_allocated = ?, updated_at = NOW() WHERE id = ?`,
                        [toAllocate, item.id]
                    );
                }
            }
        }

        const updated = await queryOne(
            `SELECT gi.*,
                COALESCE(alloc.total_allocated, 0) AS total_allocated,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS available_qty
            FROM global_inventory gi
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE gi.id = ?`,
            [id]
        );
        res.json({
            ...mapRowToInventory(updated),
            totalAllocated: updated.total_allocated ?? 0,
            availableQty: updated.available_qty ?? updated.quantity_on_hand,
        });
    } catch (error) {
        console.error('Error updating inventory item:', error);
        res.status(500).json({ error: 'Failed to update inventory item' });
    }
}

/**
 * GET /api/inventory/available - List inventory items with available qty
 * Available = quantityOnHand - total allocated across all PBOM items
 */
export async function getAvailableInventory(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query(
            `SELECT gi.*,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS available_qty
            FROM global_inventory gi
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            ORDER BY gi.part_number ASC`
        );

        const items = rows.map(row => ({
            ...mapRowToInventory(row),
            availableQty: row.available_qty ?? row.quantity_on_hand,
        }));

        res.json(items);
    } catch (error) {
        console.error('Error fetching available inventory:', error);
        res.status(500).json({ error: 'Failed to fetch available inventory' });
    }
}

/**
 * GET /api/inventory/:id/demand-details - Get PBOM items contributing to demand
 */
export async function getDemandDetails(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const inventoryRow = await queryOne(
            `SELECT gi.*,
                COALESCE(alloc.total_allocated, 0) AS total_allocated,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS available_qty
            FROM global_inventory gi
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE gi.id = ?`,
            [id]
        );

        if (!inventoryRow) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        const demandRows = await query(
            `SELECT p.id, p.job_id, p.description, p.qty_required, p.qty_allocated,
                    (p.qty_required - p.qty_allocated) AS qty_to_order,
                    p.status, p.mfr_vendor, p.mfr_vendor_part,
                    j.job_number, j.description AS job_description
            FROM pbom_items p
            JOIN jobs j ON p.job_id = j.id
            WHERE p.global_inventory_id = ?
              AND p.sent_to_sc = TRUE
              AND p.status != 'Received'
              AND p.qty_required > p.qty_allocated
              AND j.status IN ('Active', 'On Hold')
            ORDER BY j.job_number`,
            [id]
        );

        const demandItems: DemandDetailItem[] = demandRows.map(row => ({
            id: row.id,
            jobId: row.job_id,
            jobNumber: row.job_number,
            jobDescription: row.job_description,
            description: row.description,
            qtyRequired: row.qty_required,
            qtyAllocated: row.qty_allocated,
            qtyToOrder: row.qty_to_order,
            status: row.status,
        }));

        const totalDemand = demandItems.reduce((sum, item) => sum + item.qtyToOrder, 0);
        const availableQty = inventoryRow.available_qty ?? inventoryRow.quantity_on_hand;
        const needToOrder = Math.max(0, totalDemand - availableQty);

        res.json({
            inventoryItem: {
                ...mapRowToInventory(inventoryRow),
                totalAllocated: inventoryRow.total_allocated ?? 0,
                availableQty,
            },
            demandItems,
            totalDemand,
            needToOrder,
        });
    } catch (error) {
        console.error('Error fetching demand details:', error);
        res.status(500).json({ error: 'Failed to fetch demand details' });
    }
}

/**
 * POST /api/inventory/:id/mass-order - Mark outstanding PBOM demand as ordered
 * Body: { orderQuantity: number } - the total quantity being ordered from supplier
 */
export async function massOrder(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { orderQuantity } = req.body;

        if (orderQuantity == null || orderQuantity <= 0) {
            res.status(400).json({ error: 'Order quantity must be greater than 0' });
            return;
        }

        const existing = await queryOne('SELECT * FROM global_inventory WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        // Find all PBOM items with outstanding demand
        const demandRows = await query(
            `SELECT p.id, p.qty_required, p.qty_allocated,
                    (p.qty_required - p.qty_allocated) AS qty_to_order
            FROM pbom_items p
            JOIN jobs j ON p.job_id = j.id
            WHERE p.global_inventory_id = ?
              AND p.sent_to_sc = TRUE
              AND p.status != 'Received'
              AND p.qty_required > p.qty_allocated
              AND j.status IN ('Active', 'On Hold')
            ORDER BY j.created_at ASC`,
            [id]
        );

        let updatedCount = 0;
        let totalOrdered = 0;
        let remaining = orderQuantity;

        // First pass: cover each item's demand (oldest jobs first)
        const allocations: { id: number; qtyNeeded: number; qtyOrdered: number }[] = [];
        for (const row of demandRows) {
            if (remaining <= 0) break;
            const qtyNeeded = row.qty_to_order;
            const qtyForThis = Math.min(qtyNeeded, remaining);
            allocations.push({ id: row.id, qtyNeeded, qtyOrdered: qtyForThis });
            remaining -= qtyForThis;
        }

        // Second pass: if user ordered more than total demand, distribute surplus
        // proportionally so order tracking reflects the actual order amount
        if (remaining > 0 && allocations.length > 0) {
            const totalDemand = allocations.reduce((sum, a) => sum + a.qtyNeeded, 0);
            let surplusDistributed = 0;
            for (let i = 0; i < allocations.length; i++) {
                const a = allocations[i];
                if (i === allocations.length - 1) {
                    // Last item gets whatever remains to avoid rounding issues
                    a.qtyOrdered += (remaining - surplusDistributed);
                } else {
                    const share = Math.round((a.qtyNeeded / totalDemand) * remaining * 100) / 100;
                    a.qtyOrdered += share;
                    surplusDistributed += share;
                }
            }
        }

        // Create a single purchase order for this mass order
        const poResult = await execute(
            `INSERT INTO purchase_orders (inventory_id, description, qty_ordered, status)
             VALUES (?, ?, ?, 'Ordered')`,
            [id, existing.description || existing.part_number || 'Unknown', orderQuantity]
        );
        const purchaseOrderId = poResult.lastID;

        // Write to database and link to purchase order
        for (const a of allocations) {
            await execute(
                `UPDATE pbom_items
                 SET qty_ordered = ?, status = 'Ordered', purchase_order_id = ?, updated_at = NOW()
                 WHERE id = ?`,
                [a.qtyOrdered, purchaseOrderId, a.id]
            );
            updatedCount++;
            totalOrdered += a.qtyOrdered;
        }

        res.json({
            message: `Mass order completed: ${updatedCount} items marked as Ordered`,
            updatedCount,
            totalOrdered,
            purchaseOrderId,
        });
    } catch (error) {
        console.error('Error processing mass order:', error);
        res.status(500).json({ error: 'Failed to process mass order' });
    }
}

/**
 * DELETE /api/inventory/:id - Delete an inventory item
 */
export async function deleteInventoryItem(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const existing = await queryOne('SELECT * FROM global_inventory WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Inventory item not found' });
            return;
        }

        // Unlink any PBOM items referencing this inventory before deleting
        await execute(
            `UPDATE pbom_items SET global_inventory_id = NULL, qty_allocated = 0, updated_at = NOW() WHERE global_inventory_id = ?`,
            [id]
        );

        await execute('DELETE FROM global_inventory WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting inventory item:', error);
        res.status(500).json({ error: 'Failed to delete inventory item' });
    }
}
