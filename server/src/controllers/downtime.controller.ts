import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import { logger } from '../lib/logger';

// ---------------------------------------------------------------------------
// Helper: create a notification row
// ---------------------------------------------------------------------------
async function createNotification(opts: {
  title: string;
  message: string;
  type?: 'info' | 'warning' | 'error' | 'success';
  category?: 'machine_down' | 'quality_fail' | 'po_received' | 'job_completed' | 'shipment' | 'system';
  referenceType?: string;
  referenceId?: number;
  userId?: string;
}): Promise<void> {
  await execute(
    `INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      opts.userId ?? null,
      opts.title,
      opts.message,
      opts.type ?? 'info',
      opts.category ?? null,
      opts.referenceType ?? null,
      opts.referenceId ?? null,
    ]
  );
}

/**
 * Get all downtime events
 * GET /api/downtime
 */
export const getDowntimeEvents = async (req: Request, res: Response) => {
  try {
    const { machineId, category, from, to } = req.query;

    let sql = `
      SELECT
        mde.id,
        mde.machine_id   AS "machineId",
        m.name            AS "machineName",
        mde.category,
        mde.reason,
        mde.started_at    AS "startedAt",
        mde.ended_at      AS "endedAt",
        mde.duration_minutes AS "durationMinutes",
        mde.reported_by   AS "reportedBy",
        mde.resolved_by   AS "resolvedBy",
        mde.resolution_notes AS "resolutionNotes",
        mde.created_at    AS "createdAt"
      FROM machine_downtime_events mde
      JOIN machines m ON m.id = mde.machine_id
    `;

    const conditions: string[] = [];
    const params: any[] = [];

    if (machineId) {
      conditions.push('mde.machine_id = ?');
      params.push(Number(machineId));
    }
    if (category) {
      conditions.push('mde.category = ?');
      params.push(category);
    }
    if (from) {
      conditions.push('mde.started_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('mde.started_at <= ?');
      params.push(to);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY mde.started_at DESC';

    const rows = await query<any>(sql, params);
    res.json(rows);
  } catch (error) {
    logger.error('Error fetching downtime events', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch downtime events' });
  }
};

/**
 * Get a single downtime event
 * GET /api/downtime/:id
 */
export const getDowntimeEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const row = await queryOne<any>(`
      SELECT
        mde.id,
        mde.machine_id   AS "machineId",
        m.name            AS "machineName",
        mde.category,
        mde.reason,
        mde.started_at    AS "startedAt",
        mde.ended_at      AS "endedAt",
        mde.duration_minutes AS "durationMinutes",
        mde.reported_by   AS "reportedBy",
        mde.resolved_by   AS "resolvedBy",
        mde.resolution_notes AS "resolutionNotes",
        mde.created_at    AS "createdAt"
      FROM machine_downtime_events mde
      JOIN machines m ON m.id = mde.machine_id
      WHERE mde.id = ?
    `, [id]);

    if (!row) {
      return res.status(404).json({ error: 'Downtime event not found' });
    }

    res.json(row);
  } catch (error) {
    logger.error('Error fetching downtime event', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch downtime event' });
  }
};

/**
 * Create a downtime event
 * POST /api/downtime
 */
export const createDowntimeEvent = async (req: Request, res: Response) => {
  try {
    const { machineId, category, reason, reportedBy } = req.body;

    if (!machineId) {
      return res.status(400).json({ error: 'machineId is required' });
    }
    if (!category) {
      return res.status(400).json({ error: 'category is required' });
    }

    // Verify machine exists
    const machine = await queryOne<any>('SELECT id, name FROM machines WHERE id = ?', [machineId]);
    if (!machine) {
      return res.status(404).json({ error: 'Machine not found' });
    }

    // Create the downtime event
    const result = await execute(`
      INSERT INTO machine_downtime_events (machine_id, category, reason, reported_by)
      VALUES (?, ?, ?, ?)
    `, [machineId, category, reason || null, reportedBy || null]);

    // Update the machine status
    await execute(`
      UPDATE machines
      SET is_down = true,
          down_reason = ?,
          down_since = NOW(),
          downtime_category = ?,
          updated_at = NOW()
      WHERE id = ?
    `, [reason || category, category, machineId]);

    // Create notification
    await createNotification({
      title: 'Machine Down',
      message: `${machine.name} is down — ${category}${reason ? ': ' + reason : ''}.`,
      type: 'warning',
      category: 'machine_down',
      referenceType: 'machine',
      referenceId: machineId,
    });

    // Fetch the created event
    const event = await queryOne<any>(`
      SELECT
        mde.id,
        mde.machine_id   AS "machineId",
        m.name            AS "machineName",
        mde.category,
        mde.reason,
        mde.started_at    AS "startedAt",
        mde.ended_at      AS "endedAt",
        mde.duration_minutes AS "durationMinutes",
        mde.reported_by   AS "reportedBy",
        mde.resolved_by   AS "resolvedBy",
        mde.resolution_notes AS "resolutionNotes",
        mde.created_at    AS "createdAt"
      FROM machine_downtime_events mde
      JOIN machines m ON m.id = mde.machine_id
      WHERE mde.id = ?
    `, [result.lastID]);

    res.status(201).json(event);
  } catch (error) {
    logger.error('Error creating downtime event', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to create downtime event' });
  }
};

/**
 * Resolve a downtime event
 * PUT /api/downtime/:id/resolve
 */
export const resolveDowntimeEvent = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { resolvedBy, resolutionNotes } = req.body;

    // Check event exists and is still open
    const existing = await queryOne<any>(
      'SELECT id, machine_id, ended_at FROM machine_downtime_events WHERE id = ?',
      [id]
    );
    if (!existing) {
      return res.status(404).json({ error: 'Downtime event not found' });
    }
    if (existing.ended_at) {
      return res.status(400).json({ error: 'Downtime event is already resolved' });
    }

    // Resolve the event
    await execute(`
      UPDATE machine_downtime_events
      SET ended_at = NOW(),
          resolved_by = ?,
          resolution_notes = ?
      WHERE id = ?
    `, [resolvedBy || null, resolutionNotes || null, id]);

    // Clear machine down status
    await execute(`
      UPDATE machines
      SET is_down = false,
          down_reason = NULL,
          down_since = NULL,
          downtime_category = NULL,
          updated_at = NOW()
      WHERE id = ?
    `, [existing.machine_id]);

    // Fetch updated event
    const event = await queryOne<any>(`
      SELECT
        mde.id,
        mde.machine_id   AS "machineId",
        m.name            AS "machineName",
        mde.category,
        mde.reason,
        mde.started_at    AS "startedAt",
        mde.ended_at      AS "endedAt",
        mde.duration_minutes AS "durationMinutes",
        mde.reported_by   AS "reportedBy",
        mde.resolved_by   AS "resolvedBy",
        mde.resolution_notes AS "resolutionNotes",
        mde.created_at    AS "createdAt"
      FROM machine_downtime_events mde
      JOIN machines m ON m.id = mde.machine_id
      WHERE mde.id = ?
    `, [id]);

    res.json(event);
  } catch (error) {
    logger.error('Error resolving downtime event', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to resolve downtime event' });
  }
};

/**
 * Get downtime analytics
 * GET /api/downtime/analytics
 */
export const getDowntimeAnalytics = async (req: Request, res: Response) => {
  try {
    const { from, to } = req.query;

    const conditions: string[] = [];
    const params: any[] = [];

    if (from) {
      conditions.push('mde.started_at >= ?');
      params.push(from);
    }
    if (to) {
      conditions.push('mde.started_at <= ?');
      params.push(to);
    }

    const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

    // Summary metrics
    const summary = await queryOne<any>(`
      SELECT
        COALESCE(SUM(mde.duration_minutes), 0) AS "totalDowntimeMinutes",
        COUNT(*)                                AS "totalEvents",
        COALESCE(AVG(mde.duration_minutes) FILTER (WHERE mde.ended_at IS NOT NULL), 0) AS "mttr"
      FROM machine_downtime_events mde
      ${whereClause}
    `, params);

    // MTBF: total operating time / number of failures
    // Operating time = (to - from) * machine count - total downtime
    const machineCount = await queryOne<any>(
      'SELECT COUNT(*) AS count FROM machines WHERE active = true',
      []
    );
    const numMachines = machineCount?.count || 1;
    const numFailures = Number(summary?.totalEvents) || 0;

    let mtbf = 0;
    if (from && to && numFailures > 0) {
      const rangeResult = await queryOne<any>(
        `SELECT EXTRACT(EPOCH FROM (?::timestamptz - ?::timestamptz)) / 60.0 AS "rangeMinutes"`,
        [to, from]
      );
      const totalPlannedMinutes = (rangeResult?.rangeMinutes || 0) * numMachines;
      const totalDowntime = Number(summary?.totalDowntimeMinutes) || 0;
      const operatingMinutes = totalPlannedMinutes - totalDowntime;
      mtbf = operatingMinutes / numFailures;
    }

    // Breakdown by category
    const byCategory = await query<any>(`
      SELECT
        mde.category,
        COUNT(*)                               AS "eventCount",
        COALESCE(SUM(mde.duration_minutes), 0) AS "totalMinutes"
      FROM machine_downtime_events mde
      ${whereClause}
      GROUP BY mde.category
      ORDER BY "totalMinutes" DESC
    `, params);

    // Breakdown by machine
    const byMachine = await query<any>(`
      SELECT
        mde.machine_id AS "machineId",
        m.name         AS "machineName",
        COUNT(*)                               AS "eventCount",
        COALESCE(SUM(mde.duration_minutes), 0) AS "totalMinutes"
      FROM machine_downtime_events mde
      JOIN machines m ON m.id = mde.machine_id
      ${whereClause}
      GROUP BY mde.machine_id, m.name
      ORDER BY "totalMinutes" DESC
    `, params);

    // Daily trend
    const dailyTrend = await query<any>(`
      SELECT
        DATE(mde.started_at) AS "date",
        COALESCE(SUM(mde.duration_minutes), 0) AS "totalMinutes",
        COUNT(*) AS "eventCount"
      FROM machine_downtime_events mde
      ${whereClause}
      GROUP BY DATE(mde.started_at)
      ORDER BY "date" ASC
    `, params);

    res.json({
      totalDowntimeMinutes: Number(summary?.totalDowntimeMinutes) || 0,
      totalEvents: Number(summary?.totalEvents) || 0,
      mttr: Number(Number(summary?.mttr || 0).toFixed(2)),
      mtbf: Number(mtbf.toFixed(2)),
      byCategory,
      byMachine,
      dailyTrend,
    });
  } catch (error) {
    logger.error('Error fetching downtime analytics', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch downtime analytics' });
  }
};

/**
 * Get OEE metrics
 * GET /api/downtime/oee
 */
export const getOeeMetrics = async (req: Request, res: Response) => {
  try {
    const { from, to, machineId } = req.query;

    if (!from || !to) {
      return res.status(400).json({ error: 'from and to date query params are required' });
    }

    // -----------------------------------------------------------------------
    // Machine scope
    // -----------------------------------------------------------------------
    let machineCondition = '';
    const machineParams: any[] = [];
    if (machineId) {
      machineCondition = 'WHERE id = ?';
      machineParams.push(Number(machineId));
    } else {
      machineCondition = 'WHERE active = true';
    }
    const machineCountRow = await queryOne<any>(
      `SELECT COUNT(*) AS count FROM machines ${machineCondition}`,
      machineParams
    );
    const numMachines = Number(machineCountRow?.count) || 1;

    // -----------------------------------------------------------------------
    // Planned time (minutes)
    // -----------------------------------------------------------------------
    const rangeRow = await queryOne<any>(
      `SELECT EXTRACT(EPOCH FROM (?::timestamptz - ?::timestamptz)) / 60.0 AS "rangeMinutes"`,
      [to, from]
    );
    const plannedMinutes = (Number(rangeRow?.rangeMinutes) || 0) * numMachines;

    // -----------------------------------------------------------------------
    // Availability
    // -----------------------------------------------------------------------
    let downtimeSql = `
      SELECT COALESCE(SUM(duration_minutes), 0) AS "totalDowntime"
      FROM machine_downtime_events
      WHERE started_at >= ? AND started_at <= ?
    `;
    const downtimeParams: any[] = [from, to];
    if (machineId) {
      downtimeSql += ' AND machine_id = ?';
      downtimeParams.push(Number(machineId));
    }
    const downtimeRow = await queryOne<any>(downtimeSql, downtimeParams);
    const downtimeMinutes = Number(downtimeRow?.totalDowntime) || 0;

    const availability = plannedMinutes > 0
      ? ((plannedMinutes - downtimeMinutes) / plannedMinutes) * 100
      : 0;

    // -----------------------------------------------------------------------
    // Performance
    // -----------------------------------------------------------------------
    // Actual output = tracked parts completed in range
    let perfSql = `
      SELECT COUNT(*) AS "actualOutput"
      FROM tracked_parts
      WHERE status = 'Completed'
        AND updated_at >= ? AND updated_at <= ?
    `;
    const perfParams: any[] = [from, to];
    if (machineId) {
      // Filter to parts that went through a route step on this machine
      perfSql = `
        SELECT COUNT(DISTINCT tp.id) AS "actualOutput"
        FROM tracked_parts tp
        JOIN part_station_logs psl ON psl.tracked_part_id = tp.id
        JOIN route_template_steps rts ON rts.id = psl.route_step_id
        WHERE tp.status = 'Completed'
          AND tp.updated_at >= ? AND tp.updated_at <= ?
          AND rts.machine_id = ?
      `;
      perfParams.push(Number(machineId));
    }
    const perfRow = await queryOne<any>(perfSql, perfParams);
    const actualOutput = Number(perfRow?.actualOutput) || 0;

    // Expected output: 1 part per hour baseline × operating hours × machines
    const operatingMinutes = plannedMinutes - downtimeMinutes;
    const operatingHours = operatingMinutes / 60;
    const expectedOutput = operatingHours; // 1 part/hr/machine already scaled by numMachines in plannedMinutes

    const performance = expectedOutput > 0
      ? (actualOutput / expectedOutput) * 100
      : 0;

    // -----------------------------------------------------------------------
    // Quality
    // -----------------------------------------------------------------------
    let qualBaseSql = `
      SELECT
        COUNT(*)                                              AS "totalParts",
        COUNT(*) FILTER (WHERE psl.quality_status = 'Pass')   AS "goodParts"
      FROM part_station_logs psl
      WHERE psl.checked_in_at >= ? AND psl.checked_in_at <= ?
    `;
    const qualParams: any[] = [from, to];
    if (machineId) {
      qualBaseSql = `
        SELECT
          COUNT(*)                                              AS "totalParts",
          COUNT(*) FILTER (WHERE psl.quality_status = 'Pass')   AS "goodParts"
        FROM part_station_logs psl
        JOIN route_template_steps rts ON rts.id = psl.route_step_id
        WHERE psl.checked_in_at >= ? AND psl.checked_in_at <= ?
          AND rts.machine_id = ?
      `;
      qualParams.push(Number(machineId));
    }
    const qualRow = await queryOne<any>(qualBaseSql, qualParams);
    const totalParts = Number(qualRow?.totalParts) || 0;
    const goodParts = Number(qualRow?.goodParts) || 0;

    const quality = totalParts > 0
      ? (goodParts / totalParts) * 100
      : 100; // No inspections → assume 100 %

    // -----------------------------------------------------------------------
    // OEE
    // -----------------------------------------------------------------------
    const oee = (availability * performance * quality) / 10000;

    // -----------------------------------------------------------------------
    // Per-machine breakdown
    // -----------------------------------------------------------------------
    const machineListSql = machineId
      ? 'SELECT id, name FROM machines WHERE id = ?'
      : 'SELECT id, name FROM machines WHERE active = true ORDER BY name';
    const machineListParams: any[] = machineId ? [Number(machineId)] : [];
    const machineList = await query<any>(machineListSql, machineListParams);

    const perMachineRange = Number(rangeRow?.rangeMinutes) || 0;

    // Fetch all per-machine metrics in 3 bulk queries instead of 3 × N queries
    const machineIds = machineList.map((m: any) => m.id);

    // Bulk downtime per machine
    const downtimeByMachineRows = machineIds.length > 0
      ? await query<any>(`
          SELECT machine_id AS "machineId",
                 COALESCE(SUM(duration_minutes), 0) AS "dt"
          FROM machine_downtime_events
          WHERE machine_id = ANY(?) AND started_at >= ? AND started_at <= ?
          GROUP BY machine_id
        `, [machineIds, from, to])
      : [];
    const downtimeByMachine = new Map<number, number>();
    for (const row of downtimeByMachineRows) {
      downtimeByMachine.set(row.machineId, Number(row.dt) || 0);
    }

    // Bulk performance per machine (completed parts routed through each machine)
    const perfByMachineRows = machineIds.length > 0
      ? await query<any>(`
          SELECT rts.machine_id AS "machineId",
                 COUNT(DISTINCT tp.id) AS "out"
          FROM tracked_parts tp
          JOIN part_station_logs psl ON psl.tracked_part_id = tp.id
          JOIN route_template_steps rts ON rts.id = psl.route_step_id
          WHERE tp.status = 'Completed'
            AND tp.updated_at >= ? AND tp.updated_at <= ?
            AND rts.machine_id = ANY(?)
          GROUP BY rts.machine_id
        `, [from, to, machineIds])
      : [];
    const perfByMachine = new Map<number, number>();
    for (const row of perfByMachineRows) {
      perfByMachine.set(row.machineId, Number(row.out) || 0);
    }

    // Bulk quality per machine
    const qualByMachineRows = machineIds.length > 0
      ? await query<any>(`
          SELECT rts.machine_id AS "machineId",
                 COUNT(*)                                            AS "total",
                 COUNT(*) FILTER (WHERE psl.quality_status = 'Pass') AS "good"
          FROM part_station_logs psl
          JOIN route_template_steps rts ON rts.id = psl.route_step_id
          WHERE psl.checked_in_at >= ? AND psl.checked_in_at <= ?
            AND rts.machine_id = ANY(?)
          GROUP BY rts.machine_id
        `, [from, to, machineIds])
      : [];
    const qualByMachine = new Map<number, { total: number; good: number }>();
    for (const row of qualByMachineRows) {
      qualByMachine.set(row.machineId, {
        total: Number(row.total) || 0,
        good: Number(row.good) || 0,
      });
    }

    // Assemble per-machine OEE results
    const perMachine: any[] = [];
    for (const m of machineList) {
      const mDowntime = downtimeByMachine.get(m.id) || 0;
      const mAvail = perMachineRange > 0
        ? ((perMachineRange - mDowntime) / perMachineRange) * 100
        : 0;

      const mActual = perfByMachine.get(m.id) || 0;
      const mExpected = (perMachineRange - mDowntime) / 60; // operating hours
      const mPerf = mExpected > 0 ? (mActual / mExpected) * 100 : 0;

      const mQual_ = qualByMachine.get(m.id);
      const mTotal = mQual_?.total || 0;
      const mGood = mQual_?.good || 0;
      const mQual = mTotal > 0 ? (mGood / mTotal) * 100 : 100;

      const mOee = (mAvail * mPerf * mQual) / 10000;

      perMachine.push({
        machineId: m.id,
        machineName: m.name,
        availability: Number(mAvail.toFixed(2)),
        performance: Number(mPerf.toFixed(2)),
        quality: Number(mQual.toFixed(2)),
        oee: Number(mOee.toFixed(2)),
      });
    }

    res.json({
      from,
      to,
      plannedMinutes: Number(plannedMinutes.toFixed(2)),
      downtimeMinutes: Number(downtimeMinutes.toFixed(2)),
      availability: Number(availability.toFixed(2)),
      performance: Number(performance.toFixed(2)),
      quality: Number(quality.toFixed(2)),
      oee: Number(oee.toFixed(2)),
      perMachine,
    });
  } catch (error) {
    logger.error('Error calculating OEE metrics', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to calculate OEE metrics' });
  }
};
