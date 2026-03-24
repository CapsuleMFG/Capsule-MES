import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import * as XLSX from 'xlsx';
import type { PbomItem, PbomOrderItem, CreatePbomItemRequest, UpdatePbomItemRequest, PbomStatus } from '../../../shared/types';
import { logger } from '../lib/logger';

interface PbomRow {
    description: string;
    qtyRequired: number;
    mfrVendor?: string;
    mfrVendorPart?: string;
    category?: string;
    reqNumber?: string;
    poNumber?: string;
    notes?: string;
    status?: PbomStatus;
}

/**
 * Auto-match a PBOM item to global inventory
 * Priority: 1) Description match, 2) Part number match
 * Returns the inventory ID if matched, null otherwise
 */
async function autoMatchToInventory(description: string | undefined, mfrVendorPart: string | undefined): Promise<number | null> {
    let invMatch = null;

    // Priority 1: Try matching by description (case-insensitive, trimmed)
    if (description) {
        invMatch = await queryOne(
            `SELECT id FROM global_inventory
             WHERE LOWER(TRIM(description)) = LOWER(TRIM(?))
             LIMIT 1`,
            [description]
        );
    }

    // Priority 2: If no description match, try part number
    if (!invMatch && mfrVendorPart) {
        invMatch = await queryOne(
            `SELECT id FROM global_inventory
             WHERE LOWER(TRIM(part_number)) = LOWER(TRIM(?))
             LIMIT 1`,
            [mfrVendorPart]
        );
    }

    return invMatch ? invMatch.id : null;
}

/**
 * Get available quantity for a global inventory item.
 * Available = quantity_on_hand - SUM(qty_allocated across all PBOM items linked to it)
 * Optionally excludes a specific PBOM item (for re-allocation scenarios).
 */
async function getAvailableQtyForInventoryItem(inventoryId: number, excludePbomId?: number): Promise<number> {
    const row = await queryOne(
        `SELECT gi.quantity_on_hand - COALESCE(
            (SELECT SUM(qty_allocated) FROM pbom_items
             WHERE global_inventory_id = ? AND sent_to_sc = TRUE ${excludePbomId ? 'AND id != ?' : ''}), 0
        ) AS available
        FROM global_inventory gi WHERE gi.id = ?`,
        excludePbomId ? [inventoryId, excludePbomId, inventoryId] : [inventoryId, inventoryId]
    );
    return row ? Math.max(0, row.available) : 0;
}

/**
 * Auto-allocate inventory for a matched PBOM item.
 * Allocates MIN(qtyRequired, availableQty) from global inventory.
 */
async function autoAllocateForMatch(pbomId: number, inventoryId: number, qtyRequired: number): Promise<number> {
    const available = await getAvailableQtyForInventoryItem(inventoryId, pbomId);
    const toAllocate = Math.min(qtyRequired, available);
    if (toAllocate > 0) {
        await execute(
            `UPDATE pbom_items SET qty_allocated = ?, updated_at = NOW() WHERE id = ?`,
            [toAllocate, pbomId]
        );
    }
    return toAllocate;
}

/**
 * Convert database row to PbomItem object
 */
function mapRowToPbomItem(row: any): PbomItem {
    const item: PbomItem = {
        id: row.id,
        jobId: row.job_id,
        description: row.description,
        qtyRequired: row.qty_required,
        mfrVendor: row.mfr_vendor,
        mfrVendorPart: row.mfr_vendor_part,
        category: row.category,
        reqNumber: row.req_number,
        poNumber: row.po_number,
        notes: row.notes,
        status: row.status,
        sentToSc: row.sent_to_sc === true,
        globalInventoryId: row.global_inventory_id || undefined,
        qtyAllocated: row.qty_allocated || 0,
        qtyOrdered: row.qty_ordered || 0,
        qtyReceived: row.qty_received || 0,
        expectedReceiveDate: row.expected_receive_date || undefined,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };

    // Include joined inventory data if present (check for quantity_on_hand since part_number can be null)
    if (row.inv_quantity_on_hand !== undefined && row.inv_quantity_on_hand !== null) {
        item.inventoryItem = {
            partNumber: row.inv_part_number || null,
            description: row.inv_description,
            quantityOnHand: row.inv_quantity_on_hand,
            unit: row.inv_unit,
            unitCost: row.inv_unit_cost,
            availableQty: row.inv_available_qty ?? row.inv_quantity_on_hand,
        };
    }

    return item;
}

/**
 * GET /api/jobs/:jobId/pbom - List all PBOM items for a job
 * Also cleans up stale inventory links where description/part no longer match
 */
export async function getPbomItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Auto-unlink stale matches on read: PBOM items linked to inventory
        // where neither description nor part number matches anymore
        await execute(
            `UPDATE pbom_items SET global_inventory_id = NULL, qty_allocated = 0, updated_at = NOW()
             WHERE job_id = ? AND global_inventory_id IS NOT NULL
               AND id IN (
                   SELECT p.id FROM pbom_items p
                   JOIN global_inventory gi ON p.global_inventory_id = gi.id
                   WHERE p.job_id = ?
                     AND LOWER(TRIM(p.description)) != LOWER(TRIM(gi.description))
                     AND (p.mfr_vendor_part IS NULL OR gi.part_number IS NULL OR LOWER(TRIM(p.mfr_vendor_part)) != LOWER(TRIM(gi.part_number)))
               )`,
            [jobId, jobId]
        );

        const rows = await query(
            `SELECT p.*,
                gi.part_number AS inv_part_number,
                gi.description AS inv_description,
                gi.quantity_on_hand AS inv_quantity_on_hand,
                gi.unit AS inv_unit,
                gi.unit_cost AS inv_unit_cost,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS inv_available_qty
            FROM pbom_items p
            LEFT JOIN global_inventory gi ON p.global_inventory_id = gi.id
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE p.job_id = ?
            ORDER BY p.created_at ASC`,
            [jobId]
        );
        const pbomItems = rows.map(mapRowToPbomItem);

        res.json(pbomItems);
    } catch (error) {
        logger.error('Error fetching PBOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch PBOM items' });
    }
}

/**
 * POST /api/jobs/:jobId/pbom - Create a new PBOM item
 */
export async function createPbomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const pbomData: CreatePbomItemRequest = req.body;

        if (!pbomData.description || !pbomData.qtyRequired) {
            res.status(400).json({ error: 'Description and quantity required are required' });
            return;
        }

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Auto-match to global inventory
        const inventoryId = await autoMatchToInventory(pbomData.description, pbomData.mfrVendorPart);

        const result = await execute(
            `INSERT INTO pbom_items (
                job_id, description, qty_required, mfr_vendor, mfr_vendor_part,
                category, req_number, po_number, notes, status, global_inventory_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                jobId,
                pbomData.description,
                pbomData.qtyRequired,
                pbomData.mfrVendor || null,
                pbomData.mfrVendorPart || null,
                pbomData.category || null,
                pbomData.reqNumber || null,
                pbomData.poNumber || null,
                pbomData.notes || null,
                pbomData.status || 'Ready',
                inventoryId || null,
            ]
        );

        // Auto-allocate inventory if matched
        if (inventoryId && result.lastID) {
            await autoAllocateForMatch(result.lastID, inventoryId, pbomData.qtyRequired);
        }

        // Return with joined inventory data if matched
        const newPbomItem = await queryOne(
            `SELECT p.*,
                gi.part_number AS inv_part_number,
                gi.description AS inv_description,
                gi.quantity_on_hand AS inv_quantity_on_hand,
                gi.unit AS inv_unit,
                gi.unit_cost AS inv_unit_cost,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS inv_available_qty
            FROM pbom_items p
            LEFT JOIN global_inventory gi ON p.global_inventory_id = gi.id
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE p.id = ?`,
            [result.lastID]
        );
        if (!newPbomItem) {
            res.status(500).json({ error: 'Failed to retrieve created PBOM item' });
            return;
        }
        res.status(201).json(mapRowToPbomItem(newPbomItem));
    } catch (error) {
        logger.error('Error creating PBOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create PBOM item' });
    }
}

/**
 * PUT /api/jobs/:jobId/pbom/:pbomId - Update a PBOM item
 */
export async function updatePbomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, pbomId } = req.params;
        const updates: UpdatePbomItemRequest = req.body;

        // Check if PBOM item exists and belongs to the job
        const existing = await queryOne(
            `SELECT * FROM pbom_items WHERE id = ? AND job_id = ?`,
            [pbomId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'PBOM item not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.description !== undefined) {
            setClauses.push('description = ?');
            values.push(updates.description);
        }
        if (updates.qtyRequired !== undefined) {
            setClauses.push('qty_required = ?');
            values.push(updates.qtyRequired);
        }
        if (updates.mfrVendor !== undefined) {
            setClauses.push('mfr_vendor = ?');
            values.push(updates.mfrVendor);
        }
        if (updates.mfrVendorPart !== undefined) {
            setClauses.push('mfr_vendor_part = ?');
            values.push(updates.mfrVendorPart);
        }
        if (updates.category !== undefined) {
            setClauses.push('category = ?');
            values.push(updates.category);
        }
        if (updates.reqNumber !== undefined) {
            setClauses.push('req_number = ?');
            values.push(updates.reqNumber);
        }
        if (updates.poNumber !== undefined) {
            setClauses.push('po_number = ?');
            values.push(updates.poNumber);
        }
        if (updates.notes !== undefined) {
            setClauses.push('notes = ?');
            values.push(updates.notes);
        }
        if (updates.status !== undefined) {
            setClauses.push('status = ?');
            values.push(updates.status);
        }
        if (updates.qtyOrdered !== undefined) {
            setClauses.push('qty_ordered = ?');
            values.push(updates.qtyOrdered);
        }
        if (updates.qtyReceived !== undefined) {
            setClauses.push('qty_received = ?');
            values.push(updates.qtyReceived);
        }
        if (updates.expectedReceiveDate !== undefined) {
            setClauses.push('expected_receive_date = ?');
            values.push(updates.expectedReceiveDate);
        }
        if (updates.globalInventoryId !== undefined) {
            if (updates.globalInventoryId === null) {
                // Unlink from inventory, reset allocation
                setClauses.push('global_inventory_id = NULL');
                setClauses.push('qty_allocated = 0');
            } else {
                // Validate inventory item exists
                const invItem = await queryOne('SELECT id FROM global_inventory WHERE id = ?', [updates.globalInventoryId]);
                if (!invItem) {
                    res.status(400).json({ error: 'Inventory item not found' });
                    return;
                }
                setClauses.push('global_inventory_id = ?');
                values.push(updates.globalInventoryId);
            }
        }
        if (updates.qtyAllocated !== undefined) {
            const invId = updates.globalInventoryId !== undefined
                ? updates.globalInventoryId
                : existing.global_inventory_id;

            if (invId && updates.qtyAllocated > 0) {
                // Check available inventory (exclude current item's existing allocation)
                const availRow = await queryOne(
                    `SELECT gi.quantity_on_hand - COALESCE(
                        (SELECT SUM(qty_allocated) FROM pbom_items WHERE global_inventory_id = ? AND sent_to_sc = TRUE AND id != ?), 0
                    ) AS available
                    FROM global_inventory gi WHERE gi.id = ?`,
                    [invId, pbomId, invId]
                );
                if (availRow && updates.qtyAllocated > availRow.available) {
                    res.status(400).json({
                        error: `Cannot allocate ${updates.qtyAllocated}. Only ${availRow.available} available in inventory.`
                    });
                    return;
                }
            }
            setClauses.push('qty_allocated = ?');
            values.push(updates.qtyAllocated);
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClauses.push('updated_at = NOW()');
        values.push(pbomId);

        await execute(
            `UPDATE pbom_items SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        // Re-allocate when qtyRequired changes and caller didn't explicitly set qtyAllocated
        if (updates.qtyRequired !== undefined && updates.qtyAllocated === undefined) {
            const invId = updates.globalInventoryId !== undefined
                ? updates.globalInventoryId
                : existing.global_inventory_id;
            if (invId) {
                await autoAllocateForMatch(Number(pbomId), invId, updates.qtyRequired);
            }
        }

        // Re-allocate when inventory link changes and caller didn't explicitly set qtyAllocated
        if (updates.globalInventoryId !== undefined && updates.globalInventoryId !== null && updates.qtyAllocated === undefined) {
            const qtyReq = updates.qtyRequired !== undefined ? updates.qtyRequired : existing.qty_required;
            await autoAllocateForMatch(Number(pbomId), updates.globalInventoryId, qtyReq);
        }

        // Handle inventory restock when qty_received increases
        if (updates.qtyReceived !== undefined && existing.global_inventory_id) {
            const previousReceived = existing.qty_received || 0;
            const newReceived = updates.qtyReceived;
            const delta = newReceived - previousReceived;

            if (delta > 0) {
                // Add incremental received quantity to global inventory
                await execute(
                    `UPDATE global_inventory SET quantity_on_hand = quantity_on_hand + ?, updated_at = NOW() WHERE id = ?`,
                    [delta, existing.global_inventory_id]
                );
                // Re-allocate: MIN(qtyRequired, currentAllocated + delta)
                const qtyRequired = updates.qtyRequired !== undefined ? updates.qtyRequired : existing.qty_required;
                const currentAllocated = updates.qtyAllocated !== undefined ? updates.qtyAllocated : existing.qty_allocated;
                const newAllocated = Math.min(qtyRequired, currentAllocated + delta);
                await execute(
                    `UPDATE pbom_items SET qty_allocated = ?, updated_at = NOW() WHERE id = ?`,
                    [newAllocated, pbomId]
                );
            }
        }

        // Return with joined inventory data
        const updated = await queryOne(
            `SELECT p.*,
                gi.part_number AS inv_part_number,
                gi.description AS inv_description,
                gi.quantity_on_hand AS inv_quantity_on_hand,
                gi.unit AS inv_unit,
                gi.unit_cost AS inv_unit_cost,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS inv_available_qty
            FROM pbom_items p
            LEFT JOIN global_inventory gi ON p.global_inventory_id = gi.id
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE p.id = ?`,
            [pbomId]
        );
        res.json(mapRowToPbomItem(updated));
    } catch (error) {
        logger.error('Error updating PBOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update PBOM item' });
    }
}

/**
 * DELETE /api/jobs/:jobId/pbom - Delete all PBOM items for a job
 */
export async function deleteAllPbomItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        const items = await query('SELECT id FROM pbom_items WHERE job_id = ?', [jobId]);
        if (items.length === 0) {
            res.status(404).json({ error: 'No PBOM items found for this job' });
            return;
        }

        // Check if any have been sent to supply chain
        const sentCount = await query(
            'SELECT id FROM pbom_items WHERE job_id = ? AND sent_to_sc = TRUE',
            [jobId]
        );
        if (sentCount.length > 0) {
            // Only delete items NOT sent to SC
            const result = await execute(
                'DELETE FROM pbom_items WHERE job_id = ? AND sent_to_sc = FALSE',
                [jobId]
            );
            const deleted = items.length - sentCount.length;
            res.json({
                message: `Deleted ${deleted} PBOM items (${sentCount.length} sent to SC were kept)`,
                deleted,
                kept: sentCount.length,
            });
            return;
        }

        await execute('DELETE FROM pbom_items WHERE job_id = ?', [jobId]);
        res.json({ message: `Deleted ${items.length} PBOM items`, deleted: items.length });
    } catch (error) {
        logger.error('Error deleting all PBOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete PBOM items' });
    }
}

/**
 * DELETE /api/jobs/:jobId/pbom/:pbomId - Delete a PBOM item
 */
export async function deletePbomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, pbomId } = req.params;

        // Check if PBOM item exists and belongs to the job
        const existing = await queryOne(
            `SELECT * FROM pbom_items WHERE id = ? AND job_id = ?`,
            [pbomId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'PBOM item not found' });
            return;
        }

        // Check if it's been sent to supply chain
        if (existing.sent_to_sc === true) {
            res.status(400).json({ error: 'Cannot delete PBOM item that has been sent to Supply Chain' });
            return;
        }

        await execute('DELETE FROM pbom_items WHERE id = ?', [pbomId]);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting PBOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete PBOM item' });
    }
}

/**
 * POST /api/jobs/:jobId/pbom/send-to-sc - Send PBOM to Supply Chain
 * Marks all PBOM items for this job as sent_to_sc = TRUE
 */
export async function sendToSupplyChain(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Check if there are any PBOM items
        const pbomItems = await query('SELECT * FROM pbom_items WHERE job_id = ?', [jobId]);
        if (pbomItems.length === 0) {
            res.status(400).json({ error: 'No PBOM items to send' });
            return;
        }

        // Mark all items as sent to supply chain
        await execute(
            `UPDATE pbom_items SET sent_to_sc = TRUE, updated_at = NOW() WHERE job_id = ?`,
            [jobId]
        );

        // Auto-match PBOM items to global inventory
        // Priority: 1) Description match, 2) Part number match
        const itemsToMatch = await query(
            `SELECT id, description, mfr_vendor_part, qty_required FROM pbom_items WHERE job_id = ? AND global_inventory_id IS NULL`,
            [jobId]
        );
        let matchedCount = 0;
        for (const item of itemsToMatch) {
            const inventoryId = await autoMatchToInventory(item.description, item.mfr_vendor_part);
            if (inventoryId) {
                await execute(
                    `UPDATE pbom_items SET global_inventory_id = ?, updated_at = NOW() WHERE id = ?`,
                    [inventoryId, item.id]
                );
                await autoAllocateForMatch(item.id, inventoryId, item.qty_required);
                matchedCount++;
            }
        }

        const updatedItems = await query(
            `SELECT p.*,
                gi.part_number AS inv_part_number,
                gi.description AS inv_description,
                gi.quantity_on_hand AS inv_quantity_on_hand,
                gi.unit AS inv_unit,
                gi.unit_cost AS inv_unit_cost,
                (gi.quantity_on_hand - COALESCE(alloc.total_allocated, 0)) AS inv_available_qty
            FROM pbom_items p
            LEFT JOIN global_inventory gi ON p.global_inventory_id = gi.id
            LEFT JOIN (
                SELECT global_inventory_id, SUM(qty_allocated) AS total_allocated
                FROM pbom_items
                WHERE global_inventory_id IS NOT NULL
                  AND sent_to_sc = TRUE
                GROUP BY global_inventory_id
            ) alloc ON gi.id = alloc.global_inventory_id
            WHERE p.job_id = ?
            ORDER BY p.created_at ASC`,
            [jobId]
        );
        res.json({
            message: `PBOM sent to Supply Chain successfully${matchedCount > 0 ? `. ${matchedCount} item(s) auto-matched to inventory.` : ''}`,
            itemCount: updatedItems.length,
            matchedCount,
            items: updatedItems.map(mapRowToPbomItem)
        });
    } catch (error) {
        logger.error('Error sending PBOM to Supply Chain', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to send PBOM to Supply Chain' });
    }
}

/**
 * POST /api/jobs/:jobId/pbom/auto-match - Re-validate and auto-match PBOM items to inventory
 * 1) Unlinks PBOM items whose linked inventory no longer matches by description or part number
 * 2) Matches unlinked PBOM items to global inventory by description or part number
 */
export async function autoMatchPbomToInventory(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Step 1: Unlink stale matches — PBOM items linked to inventory where neither description nor part number matches anymore
        const staleItems = await query(
            `SELECT p.id FROM pbom_items p
             JOIN global_inventory gi ON p.global_inventory_id = gi.id
             WHERE p.job_id = ?
               AND LOWER(TRIM(p.description)) != LOWER(TRIM(gi.description))
               AND (p.mfr_vendor_part IS NULL OR gi.part_number IS NULL OR LOWER(TRIM(p.mfr_vendor_part)) != LOWER(TRIM(gi.part_number)))`,
            [jobId]
        );
        let unlinkedCount = 0;
        if (staleItems.length > 0) {
            const staleIds = staleItems.map((r: any) => r.id);
            await execute(
                `UPDATE pbom_items SET global_inventory_id = NULL, qty_allocated = 0, updated_at = NOW()
                 WHERE id IN (${staleIds.map(() => '?').join(',')})`,
                staleIds
            );
            unlinkedCount = staleItems.length;
        }

        // Step 2: Match unlinked PBOM items to inventory
        const itemsToMatch = await query(
            `SELECT id, description, mfr_vendor_part, qty_required FROM pbom_items WHERE job_id = ? AND global_inventory_id IS NULL`,
            [jobId]
        );

        let matchedCount = 0;
        for (const item of itemsToMatch) {
            const inventoryId = await autoMatchToInventory(item.description, item.mfr_vendor_part);
            if (inventoryId) {
                await execute(
                    `UPDATE pbom_items SET global_inventory_id = ?, updated_at = NOW() WHERE id = ?`,
                    [inventoryId, item.id]
                );
                await autoAllocateForMatch(item.id, inventoryId, item.qty_required);
                matchedCount++;
            }
        }

        res.json({
            message: `Unlinked ${unlinkedCount} stale match(es), auto-matched ${matchedCount} of ${itemsToMatch.length} unlinked item(s)`,
            unlinkedCount,
            totalUnlinked: itemsToMatch.length,
            matchedCount,
            remainingUnlinked: itemsToMatch.length - matchedCount,
        });
    } catch (error) {
        logger.error('Error auto-matching PBOM to inventory', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to auto-match PBOM items' });
    }
}

/**
 * POST /api/jobs/:jobId/pbom/reallocate - Re-allocate inventory for all linked PBOM items
 * Useful for fixing existing data after adding auto-allocation feature
 */
export async function reallocateAllPbomItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Get all PBOM items that are linked to inventory
        const linkedItems = await query(
            `SELECT id, global_inventory_id, qty_required FROM pbom_items
             WHERE job_id = ? AND global_inventory_id IS NOT NULL`,
            [jobId]
        );

        if (linkedItems.length === 0) {
            res.json({
                message: 'No linked PBOM items found',
                reallocatedCount: 0,
            });
            return;
        }

        let reallocatedCount = 0;
        for (const item of linkedItems) {
            await autoAllocateForMatch(item.id, item.global_inventory_id, item.qty_required);
            reallocatedCount++;
        }

        res.json({
            message: `Re-allocated ${reallocatedCount} linked PBOM items`,
            totalLinked: linkedItems.length,
            reallocatedCount,
        });
    } catch (error) {
        logger.error('Error re-allocating PBOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to re-allocate PBOM items' });
    }
}

/**
 * POST /api/jobs/:jobId/pbom/import - Import PBOM items from Excel/CSV
 */
export async function importPbom(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const file = req.file;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Parse the file based on its type
        let pbomItems: PbomRow[];

        try {
            if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
                pbomItems = parsePbomCsv(file.buffer);
            } else if (
                file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel' ||
                file.originalname.endsWith('.xlsx') ||
                file.originalname.endsWith('.xls')
            ) {
                pbomItems = parsePbomExcel(file.buffer);
            } else {
                res.status(400).json({ error: 'Unsupported file type. Please upload CSV or Excel file.' });
                return;
            }

            logger.info('[PBOM Import] Parsed rows from file', { count: pbomItems.length });
            if (pbomItems.length > 0) {
                logger.info('[PBOM Import] Sample first item', { data: pbomItems[0] });
            }
        } catch (parseError) {
            logger.error('Error parsing file', { error: parseError instanceof Error ? parseError.message : parseError });
            res.status(400).json({ error: 'Failed to parse file. Please check the file format.' });
            return;
        }

        if (pbomItems.length === 0) {
            res.status(400).json({ error: 'No valid PBOM items found in file' });
            return;
        }

        // Insert PBOM items into database
        let importedCount = 0;
        const createdItems = [];

        for (const item of pbomItems) {
            if (!item.description || !item.qtyRequired || item.qtyRequired <= 0) {
                logger.warn('Skipping invalid PBOM item', { data: item });
                continue;
            }

            try {
                // Auto-match to global inventory
                const inventoryId = await autoMatchToInventory(item.description, item.mfrVendorPart);

                const result = await execute(
                    `INSERT INTO pbom_items (
                        job_id, description, qty_required, mfr_vendor, mfr_vendor_part,
                        category, req_number, po_number, notes, status, global_inventory_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        jobId,
                        item.description,
                        item.qtyRequired,
                        item.mfrVendor || null,
                        item.mfrVendorPart || null,
                        item.category || null,
                        item.reqNumber || null,
                        item.poNumber || null,
                        item.notes || null,
                        item.status || 'Ready',
                        inventoryId || null,
                    ]
                );

                // Auto-allocate inventory if matched
                if (inventoryId && result.lastID) {
                    await autoAllocateForMatch(result.lastID, inventoryId, item.qtyRequired);
                }

                importedCount++;
                createdItems.push(item);
            } catch (error) {
                logger.error('Error inserting PBOM item', { error: error instanceof Error ? error.message : error });
            }
        }

        res.status(201).json({
            message: `Successfully imported ${importedCount} PBOM items`,
            itemsImported: importedCount,
        });
    } catch (error) {
        logger.error('Error importing PBOM', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to import PBOM' });
    }
}

/**
 * Parse CSV file to PBOM items
 */
function parsePbomCsv(buffer: Buffer): PbomRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    return data.map(row => parsePbomRow(row));
}

/**
 * Parse Excel file to PBOM items
 * Intelligently finds the PBOM data table by looking for expected column headers
 */
function parsePbomExcel(buffer: Buffer): PbomRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all data without headers first to find the PBOM table
    const allData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    logger.info('[PBOM Excel] Found total rows in sheet', { count: allData.length, sheetName });

    // Find the header row by looking for PBOM-specific columns
    let headerRowIndex = -1;
    const pbomKeywords = ['description', 'qty', 'quantity', 'reqd', 'required', 'mfr', 'vendor', 'manufacturer'];

    for (let i = 0; i < Math.min(allData.length, 20); i++) {
        const row = allData[i];
        if (!row || row.length === 0) continue;

        // Convert row to lowercase and check if it contains PBOM keywords
        const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
        const matchCount = pbomKeywords.filter(keyword => rowText.includes(keyword)).length;

        // If we find at least 2 PBOM keywords, this is likely the header row
        if (matchCount >= 2) {
            headerRowIndex = i;
            logger.info('[PBOM Excel] Found PBOM header row', { index: i, row });
            break;
        }
    }

    if (headerRowIndex === -1) {
        logger.info('[PBOM Excel] Could not find PBOM header row, using default parsing');
        // Fall back to default parsing
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);
        return data.map(row => parsePbomRow(row));
    }

    // Read data starting from the header row
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, {
        range: headerRowIndex,
        defval: ''
    });

    logger.info('[PBOM Excel] Found PBOM data rows', { count: data.length, startRow: headerRowIndex + 1 });
    if (data.length > 0) {
        logger.info('[PBOM Excel] Column names', { columns: Object.keys(data[0]) });
        logger.info('[PBOM Excel] First row raw data', { data: data[0] });
        const parsedFirst = parsePbomRow(data[0]);
        logger.info('[PBOM Excel] First row parsed result', { data: parsedFirst });
    }

    return data.map(row => parsePbomRow(row));
}

/**
 * Helper function to find a value from row by checking multiple column name variations
 * Normalizes column names by converting to lowercase and removing spaces/special chars
 */
function findColumnValue(row: any, possibleNames: string[]): any {
    // First try exact matches
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
        }
    }

    // Then try normalized matching (case-insensitive, ignore spaces/special chars)
    const normalizeKey = (key: string) =>
        key.toLowerCase().replace(/[\s\/'"`´''""-\.]/g, '').replace(/[\r\n]/g, '');

    const normalizedPossibleNames = possibleNames.map(normalizeKey);
    const rowKeys = Object.keys(row);

    for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeKey(rowKey);
        if (normalizedPossibleNames.includes(normalizedRowKey)) {
            const value = row[rowKey];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
    }

    return undefined;
}

/**
 * Parse a single row to PBOM item
 * Handles various column name variations with flexible matching
 */
function parsePbomRow(row: any): PbomRow {
    // Description
    const description = findColumnValue(row, [
        'Description', 'description', 'Item', 'item', 'DESCRIPTION', 'Part Description'
    ]) || '';

    // Quantity Required
    const qtyRequiredValue = findColumnValue(row, [
        "Qty Req'd", "Qty Reqd", 'Qty Required', 'Quantity Required',
        'Qty', 'Quantity', 'qty_required', 'qtyRequired', 'QTY REQD',
        'QTY REQ\'D', 'Qty Req', 'QUANTITY REQUIRED'
    ]);
    const qtyRequired = qtyRequiredValue ? parseFloat(qtyRequiredValue.toString()) : 0;

    // Mfr/Vendor
    const mfrVendor = findColumnValue(row, [
        'Mfr/Vendor', 'Manufacturer/Vendor', 'Vendor', 'Manufacturer',
        'Mfr', 'mfr_vendor', 'mfrVendor', 'MFR/VENDOR', 'MFR'
    ]);

    // Mfr/Vendor Part
    const mfrVendorPart = findColumnValue(row, [
        'Mfr/Vendor Part', 'Part Number', 'Part #', 'Part',
        'mfr_vendor_part', 'mfrVendorPart', 'MFR/VENDOR PART', 'PART NUMBER'
    ]);

    // Category
    const category = findColumnValue(row, [
        'Category', 'category', 'CATEGORY', 'Type', 'type'
    ]);

    // Req Number (SC use only)
    const reqNumber = findColumnValue(row, [
        'Req #', 'Req Number', 'Requisition', 'req_number',
        'reqNumber', 'REQ #', 'REQ NUMBER'
    ]);

    // PO Number (PM use only)
    const poNumber = findColumnValue(row, [
        'PO', 'PO #', 'Purchase Order', 'po_number',
        'poNumber', 'PO NUMBER', 'PO#'
    ]);

    // Notes (SC use only)
    const notes = findColumnValue(row, [
        'Notes', 'notes', 'Note', 'NOTES', 'NOTE', 'Comments'
    ]);

    // Status
    let status: PbomStatus = 'Ready';
    const statusValue = findColumnValue(row, ['Status', 'status', 'STATUS']);
    if (statusValue) {
        const normalizedStatus = statusValue.toString().trim();
        if (['Ready', 'In Progress', 'Ordered', 'Received'].includes(normalizedStatus)) {
            status = normalizedStatus as PbomStatus;
        }
    }

    return {
        description: description ? description.toString().trim() : '',
        qtyRequired: qtyRequired,
        mfrVendor,
        mfrVendorPart,
        category,
        reqNumber,
        poNumber,
        notes,
        status
    };
}

/**
 * GET /api/pbom/orders - Get all ordered PBOM items across all jobs
 * Returns items with status 'Ordered' or partially received (qty_received < qty_ordered)
 */
export async function getAllOrderedPbomItems(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query(
            `SELECT p.*,
                    j.job_number, j.description AS job_description, j.priority,
                    COALESCE(c.name, 'No Client') AS client_name,
                    gi.part_number AS inv_part_number,
                    gi.description AS inv_description,
                    gi.quantity_on_hand AS inv_quantity_on_hand,
                    gi.unit AS inv_unit,
                    gi.unit_cost AS inv_unit_cost
             FROM pbom_items p
             JOIN jobs j ON p.job_id = j.id
             LEFT JOIN clients c ON j.client_id = c.id
             LEFT JOIN global_inventory gi ON p.global_inventory_id = gi.id
             WHERE p.sent_to_sc = TRUE
               AND (p.status = 'Ordered' OR (p.status = 'Received' AND p.qty_received < p.qty_ordered))
             ORDER BY
               CASE WHEN p.expected_receive_date IS NULL THEN 1 ELSE 0 END,
               p.expected_receive_date ASC,
               CASE j.priority
                 WHEN 'Critical' THEN 0
                 WHEN 'High' THEN 1
                 WHEN 'Medium' THEN 2
                 WHEN 'Low' THEN 3
                 ELSE 4
               END`,
            []
        );

        const items: PbomOrderItem[] = rows.map((row: any) => ({
            ...mapRowToPbomItem(row),
            jobNumber: row.job_number,
            jobDescription: row.job_description,
            clientName: row.client_name,
            priority: row.priority,
        }));

        res.json(items);
    } catch (error) {
        logger.error('Error fetching ordered PBOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch ordered items' });
    }
}
