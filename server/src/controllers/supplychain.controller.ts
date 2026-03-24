import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import { logger } from '../lib/logger';

/**
 * Priority weight for auto-assigning SC priority to new jobs.
 * Lower weight = higher priority when auto-assigning.
 */
function getPriorityWeight(priority: string): number {
    switch (priority) {
        case 'Critical': return 1;
        case 'High': return 2;
        case 'Medium': return 3;
        case 'Low': return 4;
        default: return 5;
    }
}

/**
 * GET /api/supply-chain/priorities
 * Returns SC jobs ordered by sc_priority. Auto-assigns priority to any NULL jobs.
 */
export async function getScPriorities(req: Request, res: Response): Promise<void> {
    try {
        // Find all SC jobs (WO Release or Materials stage is In Progress or Not Started)
        const scJobs = await query(
            `SELECT DISTINCT j.id, j.sc_priority, j.priority, j.created_at
             FROM jobs j
             JOIN job_workflow_progress jwp ON j.id = jwp.job_id
             JOIN workflow_stages ws ON jwp.stage_id = ws.id
             WHERE j.status IN ('Active', 'On Hold')
               AND ws.name IN ('WO Release', 'Materials')
               AND jwp.status IN ('In Progress', 'Not Started')
             ORDER BY j.sc_priority ASC NULLS LAST, j.created_at ASC`
        );

        // Find jobs without sc_priority and auto-assign
        const unassigned = scJobs.filter((j: any) => j.sc_priority == null);
        if (unassigned.length > 0) {
            // Find the current max priority
            const maxRow = await queryOne<{ maxPri: number }>(
                `SELECT MAX(sc_priority) as maxPri FROM jobs WHERE sc_priority IS NOT NULL`
            );
            let nextPriority = (maxRow?.maxPri || 0) + 1;

            // Sort unassigned by priority weight then created_at
            unassigned.sort((a: any, b: any) => {
                const weightDiff = getPriorityWeight(a.priority) - getPriorityWeight(b.priority);
                if (weightDiff !== 0) return weightDiff;
                return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
            });

            for (const job of unassigned) {
                await execute(
                    `UPDATE jobs SET sc_priority = ? WHERE id = ?`,
                    [nextPriority, job.id]
                );
                job.sc_priority = nextPriority;
                nextPriority++;
            }
        }

        // Return sorted list
        const sorted = scJobs.sort((a: any, b: any) => (a.sc_priority || 999999) - (b.sc_priority || 999999));
        const result = sorted.map((j: any) => ({
            jobId: j.id,
            priority: j.sc_priority,
        }));

        res.json(result);
    } catch (error) {
        logger.error('Error fetching SC priorities', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch SC priorities' });
    }
}

/**
 * PUT /api/supply-chain/priorities
 * Update SC priority order and reallocate inventory.
 */
export async function updateScPriorities(req: Request, res: Response): Promise<void> {
    try {
        const { priorities } = req.body;

        if (!Array.isArray(priorities) || priorities.length === 0) {
            res.status(400).json({ error: 'priorities array is required' });
            return;
        }

        // Update sc_priority for each job
        for (const item of priorities) {
            await execute(
                `UPDATE jobs SET sc_priority = ? WHERE id = ?`,
                [item.priority, item.jobId]
            );
        }

        // Run reallocation
        const summary = await reallocateByPriority();

        res.json({
            message: 'Priorities updated and inventory reallocated',
            reallocationSummary: summary,
        });
    } catch (error) {
        logger.error('Error updating SC priorities', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update SC priorities' });
    }
}

/**
 * Reallocate inventory across all SC PBOM items based on job sc_priority order.
 * Higher priority jobs (lower sc_priority number) get allocated first.
 */
async function reallocateByPriority(): Promise<{ inventoryItemsProcessed: number; pbomItemsReallocated: number }> {
    // Find all distinct inventory items that have PBOM demand from SC jobs
    const contestedInventory = await query(
        `SELECT DISTINCT p.global_inventory_id
         FROM pbom_items p
         JOIN jobs j ON p.job_id = j.id
         WHERE p.global_inventory_id IS NOT NULL
           AND p.sent_to_sc = TRUE
           AND p.status != 'Received'
           AND j.status IN ('Active', 'On Hold')`
    );

    let inventoryItemsProcessed = 0;
    let pbomItemsReallocated = 0;

    for (const inv of contestedInventory) {
        const inventoryId = inv.global_inventory_id;

        // Get the total on-hand for this inventory item
        const invRow = await queryOne<{ quantity_on_hand: number }>(
            `SELECT quantity_on_hand FROM global_inventory WHERE id = ?`,
            [inventoryId]
        );
        if (!invRow) continue;

        let remaining = invRow.quantity_on_hand;
        inventoryItemsProcessed++;

        // Get all PBOM items linked to this inventory, ordered by job sc_priority
        const pbomItems = await query(
            `SELECT p.id, p.qty_required, p.qty_allocated
             FROM pbom_items p
             JOIN jobs j ON p.job_id = j.id
             WHERE p.global_inventory_id = ?
               AND p.sent_to_sc = TRUE
               AND p.status != 'Received'
               AND j.status IN ('Active', 'On Hold')
             ORDER BY COALESCE(j.sc_priority, 999999) ASC, j.created_at ASC`,
            [inventoryId]
        );

        // Reallocate in priority order
        for (const item of pbomItems) {
            const toAllocate = Math.min(item.qty_required, Math.max(0, remaining));
            if (toAllocate !== item.qty_allocated) {
                await execute(
                    `UPDATE pbom_items SET qty_allocated = ?, updated_at = NOW() WHERE id = ?`,
                    [toAllocate, item.id]
                );
                pbomItemsReallocated++;
            }
            remaining -= toAllocate;
        }
    }

    return { inventoryItemsProcessed, pbomItemsReallocated };
}
