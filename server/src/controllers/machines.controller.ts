import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { Machine, CreateMachineRequest, UpdateMachineRequest } from '../../../shared/types';

/**
 * Get all machines
 * GET /api/machines
 */
export const getMachines = async (req: Request, res: Response) => {
  try {
    const { active } = req.query;

    let sql = `
      SELECT
        id,
        name,
        type,
        active,
        display_order as "displayOrder",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM machines
    `;

    const params: any[] = [];

    // Filter by active status if provided
    if (active !== undefined) {
      sql += ' WHERE active = ?';
      params.push(active === 'true');
    }

    sql += ' ORDER BY display_order ASC, name ASC';

    const rows = await query<any>(sql, params);

    const machinesList: Machine[] = rows.map((row: any) => ({
      id: row.id,
      name: row.name,
      type: row.type,
      active: Boolean(row.active),
      displayOrder: row.displayOrder,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    res.json(machinesList);
  } catch (error) {
    console.error('Error fetching machines:', error);
    res.status(500).json({ error: 'Failed to fetch machines' });
  }
};

/**
 * Get a single machine by ID
 * GET /api/machines/:id
 */
export const getMachine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const row = await queryOne<any>(`
      SELECT
        id,
        name,
        type,
        active,
        display_order as "displayOrder",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM machines
      WHERE id = ?
    `, [id]);

    if (!row) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    const machine: Machine = {
      id: row.id,
      name: row.name,
      type: row.type,
      active: Boolean(row.active),
      displayOrder: row.displayOrder,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    res.json(machine);
  } catch (error) {
    console.error('Error fetching machine:', error);
    res.status(500).json({ error: 'Failed to fetch machine' });
  }
};

/**
 * Create a new machine
 * POST /api/machines
 */
export const createMachine = async (req: Request, res: Response) => {
  try {
    const data: CreateMachineRequest = req.body;

    // Validate required fields
    if (!data.name) {
      return res.status(400).json({ error: 'Machine name is required' });
    }

    // Check if machine name already exists
    const existing = await queryOne<any>('SELECT id FROM machines WHERE name = ?', [data.name]);
    if (existing) {
      return res.status(400).json({ error: 'Machine with this name already exists' });
    }

    // Insert new machine
    const result = await execute(`
      INSERT INTO machines (name, type, active, display_order, notes)
      VALUES (?, ?, ?, ?, ?)
    `, [
      data.name,
      data.type || null,
      data.active !== false,
      data.displayOrder || 0,
      data.notes || null,
    ]);

    // Get the created machine
    const row = await queryOne<any>(`
      SELECT
        id,
        name,
        type,
        active,
        display_order as "displayOrder",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM machines
      WHERE id = ?
    `, [result.lastID]);

    const machine: Machine = {
      id: row.id,
      name: row.name,
      type: row.type,
      active: Boolean(row.active),
      displayOrder: row.displayOrder,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    res.status(201).json(machine);
  } catch (error) {
    console.error('Error creating machine:', error);
    res.status(500).json({ error: 'Failed to create machine' });
  }
};

/**
 * Update a machine
 * PUT /api/machines/:id
 */
export const updateMachine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateMachineRequest = req.body;

    // Check if machine exists
    const existing = await queryOne<any>('SELECT id FROM machines WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Check if name is being changed to an existing name
    if (data.name) {
      const nameCheck = await queryOne<any>('SELECT id FROM machines WHERE name = ? AND id != ?', [data.name, id]);
      if (nameCheck) {
        return res.status(400).json({ error: 'Machine with this name already exists' });
      }
    }

    // Build update query
    const updates: string[] = [];
    const params: any[] = [];

    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.type !== undefined) {
      updates.push('type = ?');
      params.push(data.type);
    }
    if (data.active !== undefined) {
      updates.push('active = ?');
      params.push(data.active !== false);
    }
    if (data.displayOrder !== undefined) {
      updates.push('display_order = ?');
      params.push(data.displayOrder);
    }
    if (data.notes !== undefined) {
      updates.push('notes = ?');
      params.push(data.notes);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = NOW()');
    params.push(id);

    await execute(`
      UPDATE machines
      SET ${updates.join(', ')}
      WHERE id = ?
    `, params);

    // Get the updated machine
    const row = await queryOne<any>(`
      SELECT
        id,
        name,
        type,
        active,
        display_order as "displayOrder",
        notes,
        created_at as "createdAt",
        updated_at as "updatedAt"
      FROM machines
      WHERE id = ?
    `, [id]);

    const machine: Machine = {
      id: row.id,
      name: row.name,
      type: row.type,
      active: Boolean(row.active),
      displayOrder: row.displayOrder,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };

    res.json(machine);
  } catch (error) {
    console.error('Error updating machine:', error);
    res.status(500).json({ error: 'Failed to update machine' });
  }
};

/**
 * Delete a machine
 * DELETE /api/machines/:id
 */
export const deleteMachine = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if machine exists
    const existing = await queryOne<any>('SELECT id FROM machines WHERE id = ?', [id]);
    if (!existing) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Check if machine is used in any work orders
    const usage = await queryOne<any>(
      'SELECT COUNT(*) as count FROM work_orders WHERE machine = (SELECT name FROM machines WHERE id = ?)',
      [id]
    );
    if (usage && usage.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete machine that is assigned to work orders',
        workOrderCount: usage.count,
      });
    }

    // Delete the machine
    await execute('DELETE FROM machines WHERE id = ?', [id]);

    res.json({ message: 'Machine deleted successfully' });
  } catch (error) {
    console.error('Error deleting machine:', error);
    res.status(500).json({ error: 'Failed to delete machine' });
  }
};
