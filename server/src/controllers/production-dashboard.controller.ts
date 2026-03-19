import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

export const getProductionDashboard = async (req: Request, res: Response): Promise<void> => {
  try {
    // KPIs
    const activeJobsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Active'`
    );

    const partsCompletedTodayResult = await queryOne<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM tracked_parts
       WHERE status = 'Completed' AND updated_at::date = CURRENT_DATE`
    );

    const completedJobs = await query<{ on_time: boolean }>(
      `SELECT (completed_date <= target_end_date) as on_time
       FROM jobs WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL`
    );
    const onTimeRate = completedJobs.length > 0
      ? Math.round((completedJobs.filter(j => j.on_time).length / completedJobs.length) * 100)
      : 100;

    const blockedJobsResult = await queryOne<{ count: string }>(
      `SELECT COUNT(DISTINCT job_id)::text as count FROM job_workflow_progress WHERE status = 'Blocked'`
    );

    // Machines with status derivation
    const machines = await query<{
      id: number; name: string; type: string; active: number;
      is_down: boolean; down_reason: string | null; down_since: string | null;
    }>('SELECT * FROM machines WHERE active = true ORDER BY display_order, name');

    const machineData = await Promise.all(machines.map(async (m) => {
      if (m.is_down) {
        const nextJob = await queryOne<{ id: number; job_number: string }>(
          `SELECT j.id, j.job_number FROM work_orders wo
           JOIN jobs j ON j.id = wo.job_id
           WHERE wo.assigned_machine_id = $1 AND wo.production_status IN ('In Pool', 'Assigned')
           ORDER BY j.priority, j.created_at LIMIT 1`,
          [m.id]
        );
        return {
          id: m.id, name: m.name, type: m.type || '',
          status: 'down' as const,
          currentJob: null, currentOperator: null, currentPart: null,
          nextJob: nextJob ? { id: nextJob.id, jobNumber: nextJob.job_number } : null,
          downReason: m.down_reason, downSince: m.down_since,
        };
      }

      const activeWo = await queryOne<{
        id: number; job_id: number; job_number: string; description: string;
      }>(
        `SELECT wo.id, wo.job_id, j.job_number, j.description
         FROM work_orders wo
         JOIN jobs j ON j.id = wo.job_id
         WHERE wo.assigned_machine_id = $1 AND wo.production_status = 'In Progress'
         LIMIT 1`,
        [m.id]
      );

      if (activeWo) {
        const partStats = await queryOne<{ completed: string; total: string }>(
          `SELECT
            COUNT(CASE WHEN status = 'Completed' THEN 1 END)::text as completed,
            COUNT(*)::text as total
           FROM tracked_parts WHERE work_order_id = $1`,
          [activeWo.id]
        );

        const currentOp = await queryOne<{ operator_name: string }>(
          `SELECT psl.operator_name FROM part_station_logs psl
           JOIN tracked_parts tp ON tp.id = psl.tracked_part_id
           WHERE tp.work_order_id = $1 AND psl.checked_out_at IS NULL
           ORDER BY psl.checked_in_at DESC LIMIT 1`,
          [activeWo.id]
        );

        return {
          id: m.id, name: m.name, type: m.type || '',
          status: 'running' as const,
          currentJob: {
            id: activeWo.job_id,
            jobNumber: activeWo.job_number,
            description: activeWo.description || '',
          },
          currentOperator: currentOp?.operator_name || null,
          currentPart: partStats ? {
            description: activeWo.description || '',
            completed: parseInt(partStats.completed),
            total: parseInt(partStats.total),
          } : null,
          nextJob: null,
          downReason: null, downSince: null,
        };
      }

      const nextJob = await queryOne<{ id: number; job_number: string }>(
        `SELECT j.id, j.job_number FROM work_orders wo
         JOIN jobs j ON j.id = wo.job_id
         WHERE wo.assigned_machine_id = $1 AND wo.production_status IN ('In Pool', 'Assigned')
         ORDER BY j.priority, j.created_at LIMIT 1`,
        [m.id]
      );

      return {
        id: m.id, name: m.name, type: m.type || '',
        status: 'idle' as const,
        currentJob: null, currentOperator: null, currentPart: null,
        nextJob: nextJob ? { id: nextJob.id, jobNumber: nextJob.job_number } : null,
        downReason: null, downSince: null,
      };
    }));

    // Job queue
    const jobQueue = await query<{
      id: number; job_number: string; client_name: string;
      description: string; priority: string; target_end_date: string | null;
      stage_name: string; stage_status: string;
    }>(
      `SELECT j.id, j.job_number, c.name as client_name, j.description, j.priority,
              j.target_end_date, jwp.stage_name, jwp.status as stage_status
       FROM jobs j
       LEFT JOIN clients c ON c.id = j.client_id
       LEFT JOIN LATERAL (
         SELECT ws.name as stage_name, jwp.status
         FROM job_workflow_progress jwp
         JOIN workflow_stages ws ON ws.id = jwp.stage_id
         WHERE jwp.job_id = j.id AND jwp.status IN ('In Progress', 'Not Started')
         ORDER BY ws.display_order
         LIMIT 1
       ) jwp ON true
       WHERE j.status = 'Active'
       ORDER BY CASE j.priority
         WHEN 'Critical' THEN 1 WHEN 'High' THEN 2
         WHEN 'Medium' THEN 3 WHEN 'Low' THEN 4 END,
       j.created_at`
    );

    // Bottlenecks
    const bottlenecks: Array<{
      type: string; message: string; severity: string; relatedId: number;
    }> = [];

    const downMachines = machineData.filter(m => m.status === 'down');
    for (const dm of downMachines) {
      bottlenecks.push({
        type: 'machine_down',
        message: `${dm.name} is down${dm.downReason ? ': ' + dm.downReason : ''}`,
        severity: 'critical',
        relatedId: dm.id,
      });
    }

    const blockedJobs = await query<{ job_id: number; job_number: string; stage_name: string }>(
      `SELECT j.id as job_id, j.job_number, ws.name as stage_name
       FROM job_workflow_progress jwp
       JOIN jobs j ON j.id = jwp.job_id
       JOIN workflow_stages ws ON ws.id = jwp.stage_id
       WHERE jwp.status = 'Blocked' AND j.status = 'Active'`
    );
    for (const bj of blockedJobs) {
      bottlenecks.push({
        type: 'job_blocked',
        message: `${bj.job_number} blocked at ${bj.stage_name}`,
        severity: 'critical',
        relatedId: bj.job_id,
      });
    }

    const overdueJobs = await query<{ id: number; job_number: string; target_end_date: string }>(
      `SELECT id, job_number, target_end_date FROM jobs
       WHERE status = 'Active' AND target_end_date < CURRENT_DATE`
    );
    for (const oj of overdueJobs) {
      bottlenecks.push({
        type: 'job_overdue',
        message: `${oj.job_number} past due (target: ${oj.target_end_date})`,
        severity: 'warning',
        relatedId: oj.id,
      });
    }

    res.json({
      kpis: {
        activeJobs: parseInt(activeJobsResult?.count || '0'),
        partsCompletedToday: parseInt(partsCompletedTodayResult?.count || '0'),
        onTimeRate,
        blockedJobs: parseInt(blockedJobsResult?.count || '0'),
      },
      machines: machineData,
      jobQueue: jobQueue.map(j => ({
        id: j.id,
        jobNumber: j.job_number,
        clientName: j.client_name || '',
        description: j.description || '',
        priority: j.priority,
        currentStage: j.stage_name || 'Completed',
        stageStatus: j.stage_status || 'Completed',
        targetEndDate: j.target_end_date,
      })),
      bottlenecks,
    });
  } catch (error) {
    console.error('Error fetching production dashboard:', error);
    res.status(500).json({ error: 'Failed to fetch production dashboard data' });
  }
};

// PUT /api/dashboard/production/machines/:id/status
export const updateMachineStatus = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { isDown, downReason } = req.body;

    await query(
      `UPDATE machines SET is_down = $1, down_reason = $2,
       down_since = CASE WHEN $1 = true THEN NOW() ELSE NULL END,
       updated_at = NOW()
       WHERE id = $3`,
      [isDown, isDown ? downReason || null : null, id]
    );

    res.json({ message: 'Machine status updated' });
  } catch (error) {
    console.error('Error updating machine status:', error);
    res.status(500).json({ error: 'Failed to update machine status' });
  }
};
