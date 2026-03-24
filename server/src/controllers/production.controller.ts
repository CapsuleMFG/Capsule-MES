import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { WorkOrder, ProductionStatus } from '../../../shared/types';
import { logger } from '../lib/logger';

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
 * Send a work order to the production pool
 */
export async function sendToProduction(req: Request, res: Response): Promise<void> {
  try {
    const { jobId, woId } = req.params;
    const { machineType } = req.body;

    if (!machineType) {
      res.status(400).json({ error: 'Machine type is required' });
      return;
    }

    // Update work order with machine type and production status
    await execute(
      `UPDATE work_orders
       SET machine_type = ?,
           production_status = 'In Pool',
           sent_to_production_at = NOW(),
           updated_at = NOW()
       WHERE id = ? AND job_id = ?`,
      [machineType, woId, jobId]
    );

    // Fetch updated work order
    const workOrderRow = await queryOne(
      `SELECT wo.*, m.name as assigned_machine_name
       FROM work_orders wo
       LEFT JOIN machines m ON wo.assigned_machine_id = m.id
       WHERE wo.id = ? AND wo.job_id = ?`,
      [woId, jobId]
    );

    if (!workOrderRow) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    res.json(mapRowToWorkOrder(workOrderRow));
  } catch (error) {
    logger.error('Error sending work order to production', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to send work order to production' });
  }
}

/**
 * Get all work orders in the production pool, grouped by machine type
 */
export async function getProductionPool(req: Request, res: Response): Promise<void> {
  try {
    const rows = await query(
      `SELECT wo.*, j.job_number, j.priority, c.name as client_name, m.name as assigned_machine_name
       FROM work_orders wo
       INNER JOIN jobs j ON wo.job_id = j.id
       INNER JOIN clients c ON j.client_id = c.id
       LEFT JOIN machines m ON wo.assigned_machine_id = m.id
       WHERE wo.production_status IN ('In Pool', 'Assigned', 'In Progress')
       ORDER BY wo.machine_type, j.priority DESC, wo.sent_to_production_at ASC`
    );

    const workOrders = rows.map(row => ({
      ...mapRowToWorkOrder(row),
      jobNumber: row.job_number,
      priority: row.priority,
      clientName: row.client_name,
    }));

    res.json(workOrders);
  } catch (error) {
    logger.error('Error fetching production pool', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch production pool' });
  }
}

/**
 * Assign a work order to a specific machine
 */
export async function assignToMachine(req: Request, res: Response): Promise<void> {
  try {
    const { woId } = req.params;
    const { machineId } = req.body;

    if (!machineId) {
      res.status(400).json({ error: 'Machine ID is required' });
      return;
    }

    // Verify machine exists
    const machine = await queryOne('SELECT id FROM machines WHERE id = ? AND active = true', [machineId]);
    if (!machine) {
      res.status(404).json({ error: 'Machine not found or inactive' });
      return;
    }

    // Update work order assignment
    await execute(
      `UPDATE work_orders
       SET assigned_machine_id = ?,
           production_status = 'Assigned',
           assigned_at = NOW(),
           updated_at = NOW()
       WHERE id = ?`,
      [machineId, woId]
    );

    // Fetch updated work order
    const workOrderRow = await queryOne(
      `SELECT wo.*, m.name as assigned_machine_name
       FROM work_orders wo
       LEFT JOIN machines m ON wo.assigned_machine_id = m.id
       WHERE wo.id = ?`,
      [woId]
    );

    if (!workOrderRow) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    res.json(mapRowToWorkOrder(workOrderRow));
  } catch (error) {
    logger.error('Error assigning work order to machine', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to assign work order to machine' });
  }
}

/**
 * Update production status of a work order
 */
export async function updateProductionStatus(req: Request, res: Response): Promise<void> {
  try {
    const { woId } = req.params;
    const { status } = req.body as { status: ProductionStatus };

    if (!status) {
      res.status(400).json({ error: 'Status is required' });
      return;
    }

    const validStatuses: ProductionStatus[] = ['Not Sent', 'In Pool', 'Assigned', 'In Progress', 'Completed', 'Discarded'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid status' });
      return;
    }

    // Build update query based on status
    const setClauses: string[] = ['production_status = ?'];
    const values: any[] = [status];

    if (status === 'In Progress') {
      setClauses.push('production_started_at = NOW()');
    } else if (status === 'Completed') {
      setClauses.push('production_completed_at = NOW()');
    }

    setClauses.push('updated_at = NOW()');
    values.push(woId);

    await execute(
      `UPDATE work_orders SET ${setClauses.join(', ')} WHERE id = ?`,
      values
    );

    // Fetch updated work order
    const workOrderRow = await queryOne(
      `SELECT wo.*, m.name as assigned_machine_name
       FROM work_orders wo
       LEFT JOIN machines m ON wo.assigned_machine_id = m.id
       WHERE wo.id = ?`,
      [woId]
    );

    if (!workOrderRow) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    res.json(mapRowToWorkOrder(workOrderRow));
  } catch (error) {
    logger.error('Error updating production status', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update production status' });
  }
}

/**
 * Update production priority of a work order
 */
export async function updateProductionPriority(req: Request, res: Response): Promise<void> {
  try {
    const { woId } = req.params;
    const { priority } = req.body;

    if (!priority) {
      res.status(400).json({ error: 'Priority is required' });
      return;
    }

    const validPriorities = ['Critical', 'High', 'Medium', 'Low'];
    if (!validPriorities.includes(priority)) {
      res.status(400).json({ error: 'Invalid priority' });
      return;
    }

    await execute(
      `UPDATE work_orders
       SET production_priority = ?,
           updated_at = NOW()
       WHERE id = ?`,
      [priority, woId]
    );

    // Fetch updated work order
    const workOrderRow = await queryOne(
      `SELECT wo.*, m.name as assigned_machine_name
       FROM work_orders wo
       LEFT JOIN machines m ON wo.assigned_machine_id = m.id
       WHERE wo.id = ?`,
      [woId]
    );

    if (!workOrderRow) {
      res.status(404).json({ error: 'Work order not found' });
      return;
    }

    res.json(mapRowToWorkOrder(workOrderRow));
  } catch (error) {
    logger.error('Error updating production priority', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update production priority' });
  }
}

/**
 * Get all active machines
 */
export async function getMachines(req: Request, res: Response): Promise<void> {
  try {
    const rows = await query(
      `SELECT * FROM machines WHERE active = true ORDER BY display_order`
    );

    const machines = rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      active: row.active === true,
      displayOrder: row.display_order,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    res.json(machines);
  } catch (error) {
    logger.error('Error fetching machines', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
}
