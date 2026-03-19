import { Request, Response } from 'express';
import { query, queryOne, execute, executeTransactionWithParams } from '../models/database';

interface ScheduleRow {
  id: number;
  job_id: number;
  machine_id: number;
  route_step_id: number | null;
  step_name: string;
  position: number;
  status: string;
  blocked_reason: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  job_number: string;
  job_description: string;
  client_name: string;
  priority: string;
  target_end_date: string | null;
  machine_name: string;
  machine_type: string;
}

function mapEntry(row: ScheduleRow) {
  return {
    id: row.id,
    jobId: row.job_id,
    machineId: row.machine_id,
    routeStepId: row.route_step_id,
    stepName: row.step_name,
    position: row.position,
    status: row.status,
    blockedReason: row.blocked_reason,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    jobNumber: row.job_number,
    jobDescription: row.job_description,
    clientName: row.client_name,
    priority: row.priority,
    targetEndDate: row.target_end_date,
  };
}

export const getSchedule = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<ScheduleRow>(
      `SELECT se.*, j.job_number, j.description as job_description,
              c.name as client_name, j.priority, j.target_end_date,
              m.name as machine_name, m.type as machine_type
       FROM schedule_entries se
       JOIN jobs j ON j.id = se.job_id
       LEFT JOIN clients c ON c.id = j.client_id
       JOIN machines m ON m.id = se.machine_id
       WHERE se.status IN ('Queued', 'In Progress', 'Blocked')
       ORDER BY se.machine_id, se.position`
    );

    const jobIds = [...new Set(rows.map(r => r.job_id))];
    let routeStepsMap: Record<number, Array<{ id: number; stepName: string; stepOrder: number; status: string; machineId: number }>> = {};

    if (jobIds.length > 0) {
      const allSteps = await query<{
        job_id: number; id: number; step_name: string; position: number;
        status: string; machine_id: number; step_order: number;
      }>(
        `SELECT se.job_id, se.id, se.step_name, se.position, se.status, se.machine_id,
                COALESCE(rts.step_order, se.position) as step_order
         FROM schedule_entries se
         LEFT JOIN route_template_steps rts ON rts.id = se.route_step_id
         WHERE se.job_id = ANY($1)
         ORDER BY step_order`,
        [jobIds]
      );

      for (const step of allSteps) {
        if (!routeStepsMap[step.job_id]) routeStepsMap[step.job_id] = [];
        routeStepsMap[step.job_id].push({
          id: step.id,
          stepName: step.step_name,
          stepOrder: step.step_order,
          status: step.status,
          machineId: step.machine_id,
        });
      }
    }

    const machines = await query<{ id: number; name: string; type: string }>(
      'SELECT id, name, type FROM machines WHERE active = true ORDER BY display_order, name'
    );

    const result = machines.map(m => ({
      machineId: m.id,
      machineName: m.name,
      machineType: m.type,
      entries: rows
        .filter(r => r.machine_id === m.id)
        .map(r => ({
          ...mapEntry(r),
          routeSteps: routeStepsMap[r.job_id] || [],
        })),
    }));

    res.json(result);
  } catch (error) {
    console.error('Error fetching schedule:', error);
    res.status(500).json({ error: 'Failed to fetch schedule' });
  }
};

export const updatePosition = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { position } = req.body;

    const entry = await queryOne<{ machine_id: number; position: number }>(
      'SELECT machine_id, position FROM schedule_entries WHERE id = ? AND status != ?',
      [id, 'Completed']
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    const oldPos = entry.position;
    const newPos = position;
    if (oldPos === newPos) { res.json({ message: 'No change' }); return; }

    if (newPos < oldPos) {
      await executeTransactionWithParams([
        { sql: 'UPDATE schedule_entries SET position = position + 1, updated_at = NOW() WHERE machine_id = ? AND position >= ? AND position < ? AND status != ?', params: [entry.machine_id, newPos, oldPos, 'Completed'] },
        { sql: 'UPDATE schedule_entries SET position = ?, updated_at = NOW() WHERE id = ?', params: [newPos, id] },
      ]);
    } else {
      await executeTransactionWithParams([
        { sql: 'UPDATE schedule_entries SET position = position - 1, updated_at = NOW() WHERE machine_id = ? AND position > ? AND position <= ? AND status != ?', params: [entry.machine_id, oldPos, newPos, 'Completed'] },
        { sql: 'UPDATE schedule_entries SET position = ?, updated_at = NOW() WHERE id = ?', params: [newPos, id] },
      ]);
    }

    res.json({ message: 'Position updated' });
  } catch (error) {
    console.error('Error updating position:', error);
    res.status(500).json({ error: 'Failed to update position' });
  }
};

export const moveEntry = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { machineId, position } = req.body;

    const entry = await queryOne<{ machine_id: number; position: number }>(
      'SELECT machine_id, position FROM schedule_entries WHERE id = ? AND status != ?',
      [id, 'Completed']
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    const oldMachine = await queryOne<{ type: string }>('SELECT type FROM machines WHERE id = ?', [entry.machine_id]);
    const newMachine = await queryOne<{ type: string }>('SELECT type FROM machines WHERE id = ?', [machineId]);
    if (!oldMachine || !newMachine) { res.status(404).json({ error: 'Machine not found' }); return; }
    if (oldMachine.type !== newMachine.type) {
      res.status(400).json({ error: 'Can only move between machines of the same type' });
      return;
    }

    await executeTransactionWithParams([
      { sql: 'UPDATE schedule_entries SET position = position - 1, updated_at = NOW() WHERE machine_id = ? AND position > ? AND status != ?', params: [entry.machine_id, entry.position, 'Completed'] },
      { sql: 'UPDATE schedule_entries SET position = position + 1, updated_at = NOW() WHERE machine_id = ? AND position >= ? AND status != ?', params: [machineId, position, 'Completed'] },
      { sql: 'UPDATE schedule_entries SET machine_id = ?, position = ?, updated_at = NOW() WHERE id = ?', params: [machineId, position, id] },
    ]);

    res.json({ message: 'Entry moved' });
  } catch (error) {
    console.error('Error moving entry:', error);
    res.status(500).json({ error: 'Failed to move entry' });
  }
};

export const updateStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { status, blockedReason } = req.body;

    const validStatuses = ['Queued', 'In Progress', 'Completed', 'Blocked'];
    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
      return;
    }

    const entry = await queryOne<{ id: number; job_id: number; route_step_id: number | null; machine_id: number }>(
      'SELECT id, job_id, route_step_id, machine_id FROM schedule_entries WHERE id = ?', [id]
    );
    if (!entry) { res.status(404).json({ error: 'Entry not found' }); return; }

    if (status === 'In Progress' && entry.route_step_id) {
      const currentStep = await queryOne<{ step_order: number; route_template_id: number }>(
        'SELECT step_order, route_template_id FROM route_template_steps WHERE id = ?', [entry.route_step_id]
      );
      if (currentStep && currentStep.step_order > 1) {
        const prevEntry = await queryOne<{ status: string }>(
          `SELECT se.status FROM schedule_entries se
           JOIN route_template_steps rts ON rts.id = se.route_step_id
           WHERE se.job_id = ? AND rts.step_order = ? AND rts.route_template_id = ? AND se.id != ?`,
          [entry.job_id, currentStep.step_order - 1, currentStep.route_template_id, id]
        );
        if (prevEntry && prevEntry.status !== 'Completed') {
          res.status(400).json({ error: 'Previous route step must be completed first' });
          return;
        }
      }
    }

    let sql = 'UPDATE schedule_entries SET status = ?, updated_at = NOW()';
    const params: (string | number | null)[] = [status];

    if (status === 'In Progress') {
      sql += ', started_at = COALESCE(started_at, NOW()), blocked_reason = NULL';
    } else if (status === 'Completed') {
      sql += ', completed_at = NOW(), blocked_reason = NULL';
    } else if (status === 'Blocked') {
      sql += ', blocked_reason = ?';
      params.push(blockedReason || null);
    } else if (status === 'Queued') {
      sql += ', blocked_reason = NULL';
    }

    params.push(id);
    sql += ` WHERE id = ?`;
    await execute(sql, params);

    res.json({ message: 'Status updated' });
  } catch (error) {
    console.error('Error updating status:', error);
    res.status(500).json({ error: 'Failed to update status' });
  }
};

export const generateScheduleEntries = async (req: Request, res: Response): Promise<void> => {
  try {
    const jobId = parseInt(req.params.jobId);
    await generateEntriesForJob(jobId);
    res.json({ message: 'Schedule entries generated' });
  } catch (error) {
    console.error('Error generating schedule entries:', error);
    res.status(500).json({ error: 'Failed to generate schedule entries' });
  }
};

export async function generateEntriesForJob(jobId: number): Promise<void> {
  const existing = await queryOne<{ count: string }>(
    'SELECT COUNT(*)::text as count FROM schedule_entries WHERE job_id = ?', [jobId]
  );
  if (parseInt(existing?.count || '0') > 0) return;

  const trackedParts = await query<{ id: number; route_template_id: number }>(
    'SELECT id, route_template_id FROM tracked_parts WHERE job_id = ? AND route_template_id IS NOT NULL',
    [jobId]
  );

  if (trackedParts.length === 0) return;

  const templateIds = [...new Set(trackedParts.map(tp => tp.route_template_id))];

  for (const templateId of templateIds) {
    const steps = await query<{
      id: number; station_name: string; machine_id: number | null; step_order: number;
    }>(
      'SELECT id, station_name, machine_id, step_order FROM route_template_steps WHERE route_template_id = ? ORDER BY step_order',
      [templateId]
    );

    for (const step of steps) {
      if (!step.machine_id) {
        console.warn(`Skipping step "${step.station_name}" — no machine assigned`);
        continue;
      }

      const maxPos = await queryOne<{ max_pos: string }>(
        `SELECT COALESCE(MAX(position), 0)::text as max_pos FROM schedule_entries
         WHERE machine_id = ? AND status IN ('Queued', 'In Progress', 'Blocked')`,
        [step.machine_id]
      );

      await execute(
        `INSERT INTO schedule_entries (job_id, machine_id, route_step_id, step_name, position, status)
         VALUES (?, ?, ?, ?, ?, 'Queued')`,
        [jobId, step.machine_id, step.id, step.station_name, parseInt(maxPos?.max_pos || '0') + 1]
      );
    }
  }
}

export const getBlockedCount = async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM schedule_entries WHERE status = 'Blocked'`
    );
    res.json({ count: parseInt(result?.count || '0') });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch blocked count' });
  }
};
