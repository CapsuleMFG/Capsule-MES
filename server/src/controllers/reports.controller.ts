import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';

export const getKpiReport = async (req: Request, res: Response): Promise<void> => {
  try {
    const { from, to } = req.query as Record<string, string>;

    const isValidDate = (d: string) => /^\d{4}-\d{2}-\d{2}$/.test(d);
    if (from && !isValidDate(from)) { res.status(400).json({ error: 'Invalid from date' }); return; }
    if (to && !isValidDate(to)) { res.status(400).json({ error: 'Invalid to date' }); return; }

    const hasDateRange = !!(from && to);

    const completedResult = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Completed' AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM jobs WHERE status = 'Completed'`
        );

    const cycleTimeResult = hasDateRange
      ? await queryOne<{ avg_days: string }>(
          `SELECT COALESCE(AVG(EXTRACT(DAY FROM (completed_date::timestamp - start_date::timestamp))), 0)::text as avg_days
           FROM jobs WHERE status = 'Completed' AND start_date IS NOT NULL AND completed_date IS NOT NULL
           AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await queryOne<{ avg_days: string }>(
          `SELECT COALESCE(AVG(EXTRACT(DAY FROM (completed_date::timestamp - start_date::timestamp))), 0)::text as avg_days
           FROM jobs WHERE status = 'Completed' AND start_date IS NOT NULL AND completed_date IS NOT NULL`
        );

    const onTimeResult = hasDateRange
      ? await query<{ on_time: boolean }>(
          `SELECT (completed_date <= target_end_date) as on_time FROM jobs
           WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL
           AND completed_date BETWEEN $1 AND $2`,
          [from, to]
        )
      : await query<{ on_time: boolean }>(
          `SELECT (completed_date <= target_end_date) as on_time FROM jobs
           WHERE status = 'Completed' AND completed_date IS NOT NULL AND target_end_date IS NOT NULL`
        );
    const onTimeRate = onTimeResult.length > 0
      ? Math.round((onTimeResult.filter(r => r.on_time).length / onTimeResult.length) * 100)
      : 100;

    const totalParts = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE updated_at BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts`);
    const scrappedParts = hasDateRange
      ? await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE status = 'Scrapped' AND updated_at BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ count: string }>(
          `SELECT COUNT(*)::text as count FROM tracked_parts WHERE status = 'Scrapped'`);
    const scrapRate = parseInt(totalParts?.count || '0') > 0
      ? Math.round((parseInt(scrappedParts?.count || '0') / parseInt(totalParts?.count || '1')) * 100)
      : 0;

    const laborResult = hasDateRange
      ? await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(hours), 0)::text as total FROM job_labor WHERE date BETWEEN $1 AND $2`, [from, to])
      : await queryOne<{ total: string }>(
          `SELECT COALESCE(SUM(hours), 0)::text as total FROM job_labor`);

    const laborByStage = hasDateRange
      ? await query<{ stage_name: string; total_hours: string }>(
          `SELECT COALESCE(ws.name, 'Unspecified') as stage_name, SUM(jl.hours)::text as total_hours
           FROM job_labor jl LEFT JOIN workflow_stages ws ON ws.id = jl.stage_id
           WHERE jl.date BETWEEN $1 AND $2 GROUP BY ws.name ORDER BY ws.name`, [from, to])
      : await query<{ stage_name: string; total_hours: string }>(
          `SELECT COALESCE(ws.name, 'Unspecified') as stage_name, SUM(jl.hours)::text as total_hours
           FROM job_labor jl LEFT JOIN workflow_stages ws ON ws.id = jl.stage_id
           GROUP BY ws.name ORDER BY ws.name`);

    res.json({
      jobsCompleted: parseInt(completedResult?.count || '0'),
      avgCycleTimeDays: parseFloat(parseFloat(cycleTimeResult?.avg_days || '0').toFixed(1)),
      onTimeRate,
      scrapRate,
      totalLaborHours: parseFloat(parseFloat(laborResult?.total || '0').toFixed(1)),
      laborByStage: Object.fromEntries(
        laborByStage.map(r => [r.stage_name, parseFloat(parseFloat(r.total_hours).toFixed(1))])
      ),
    });
  } catch (error) {
    console.error('Error fetching KPI report:', error);
    res.status(500).json({ error: 'Failed to fetch report data' });
  }
};
