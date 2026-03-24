import { Request, Response } from "express";
import { query, queryOne, execute } from "../models/database";
import type {
  TrackedPart, PartStationLog, CreateTrackedPartRequest, BulkCreateTrackedPartsRequest,
  UpdateTrackedPartRequest, CheckInRequest, CheckOutRequest, TrackedPartsSummary,
} from "../../../shared/types";
import { autoCompleteStage } from "./jobs.controller";
import { logger } from '../lib/logger';

function mapPart(row: any): TrackedPart {
  return {
    id: row.id, jobId: row.job_id, jobNumber: row.job_number,
    bomItemId: row.bom_item_id, workOrderId: row.work_order_id,
    trackingId: row.tracking_id, identificationType: row.identification_type,
    routeTemplateId: row.route_template_id, routeTemplateName: row.route_template_name,
    currentStepId: row.current_step_id, currentStationName: row.current_station_name,
    status: row.status, partNumber: row.part_number, description: row.description,
    serialNumber: row.serial_number, scrapReason: row.scrap_reason,
    scrappedAt: row.scrapped_at, recutFromId: row.recut_from_id,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at,
  };
}

function mapLog(row: any): PartStationLog {
  return {
    id: row.id, trackedPartId: row.tracked_part_id, routeStepId: row.route_step_id,
    stationName: row.station_name, stepOrder: row.step_order,
    operatorName: row.operator_name, checkedInAt: row.checked_in_at,
    checkedOutAt: row.checked_out_at, timeSpentMinutes: row.time_spent_minutes,
    qualityStatus: row.quality_status, notes: row.notes, createdAt: row.created_at,
  };
}

const PART_SELECT = "SELECT tp.id, tp.job_id, j.job_number, tp.bom_item_id, tp.work_order_id, tp.tracking_id, tp.identification_type, tp.route_template_id, rt.name as route_template_name, tp.current_step_id, rts.station_name as current_station_name, tp.status, tp.part_number, tp.description, tp.serial_number, tp.scrap_reason, tp.scrapped_at, tp.recut_from_id, tp.notes, tp.created_at, tp.updated_at FROM tracked_parts tp LEFT JOIN jobs j ON tp.job_id = j.id LEFT JOIN route_templates rt ON tp.route_template_id = rt.id LEFT JOIN route_template_steps rts ON tp.current_step_id = rts.id";

const LOG_SELECT = "SELECT psl.id, psl.tracked_part_id, psl.route_step_id, rts.station_name, rts.step_order, psl.operator_name, psl.checked_in_at, psl.checked_out_at, psl.time_spent_minutes, psl.quality_status, psl.notes, psl.created_at FROM part_station_logs psl LEFT JOIN route_template_steps rts ON psl.route_step_id = rts.id";
/** GET /api/tracked-parts */
export const getTrackedParts = async (req: Request, res: Response) => {
  try {
    const { jobId, status, search, bomItemId } = req.query;
    let sql = PART_SELECT;
    const conditions: string[] = [];
    const params: any[] = [];
    if (jobId) { conditions.push("tp.job_id = ?"); params.push(jobId); }
    if (status) { conditions.push("tp.status = ?"); params.push(status); }
    if (bomItemId) { conditions.push("tp.bom_item_id = ?"); params.push(bomItemId); }
    if (search) {
      conditions.push("(tp.tracking_id LIKE ? OR tp.part_number LIKE ? OR tp.description LIKE ?)");
      const s = `%${search}%`;
      params.push(s, s, s);
    }
    if (conditions.length) sql += " WHERE " + conditions.join(" AND ");
    sql += " ORDER BY tp.created_at DESC";
    const rows = await query<any>(sql, params);
    res.json(rows.map(mapPart));
  } catch (error) {
    logger.error("Error fetching tracked parts", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch tracked parts" });
  }
};

/** GET /api/tracked-parts/:id */
export const getTrackedPart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await queryOne<any>(PART_SELECT + " WHERE tp.id = ?", [id]);
    if (!row) return res.status(404).json({ error: "Tracked part not found" });
    const part = mapPart(row);
    const logs = await query<any>(LOG_SELECT + " WHERE psl.tracked_part_id = ? ORDER BY rts.step_order ASC, psl.checked_in_at ASC", [id]);
    part.stationLogs = logs.map(mapLog);
    res.json(part);
  } catch (error) {
    logger.error("Error fetching tracked part", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch tracked part" });
  }
};

/** GET /api/tracked-parts/lookup/:trackingId */
export const lookupByTrackingId = async (req: Request, res: Response) => {
  try {
    const { trackingId } = req.params;
    const rows = await query<any>(PART_SELECT + " WHERE tp.tracking_id = ?", [trackingId]);
    if (!rows.length) return res.status(404).json({ error: "Part not found with this tracking ID" });
    res.json(rows.map(mapPart));
  } catch (error) {
    logger.error("Error looking up part", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to look up part" });
  }
};

/** POST /api/jobs/:jobId/tracked-parts */
export const createTrackedPart = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const data: CreateTrackedPartRequest = req.body;
    const jobCheck = await queryOne<any>("SELECT id FROM jobs WHERE id = ?", [jobId]);
    if (!jobCheck) return res.status(404).json({ error: "Job not found" });
    const result = await execute(
      "INSERT INTO tracked_parts (job_id, bom_item_id, work_order_id, tracking_id, identification_type, route_template_id, part_number, description, serial_number, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [jobId, data.bomItemId || null, data.workOrderId || null, data.trackingId || null,
       data.identificationType || "Other", data.routeTemplateId || null,
       data.partNumber || null, data.description || null, data.serialNumber || null, data.notes || null]
    );
    const row = await queryOne<any>(PART_SELECT + " WHERE tp.id = ?", [result.lastID]);
    res.status(201).json(mapPart(row));
  } catch (error) {
    logger.error("Error creating tracked part", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to create tracked part" });
  }
};

/** POST /api/jobs/:jobId/tracked-parts/bulk */
export const bulkCreateTrackedParts = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const data: BulkCreateTrackedPartsRequest = req.body;
    if (!data.quantity || data.quantity < 1) return res.status(400).json({ error: "Quantity must be at least 1" });
    const jobCheck = await queryOne<any>("SELECT id FROM jobs WHERE id = ?", [jobId]);
    if (!jobCheck) return res.status(404).json({ error: "Job not found" });
    const createdIds: number[] = [];
    for (let i = 1; i <= data.quantity; i++) {
      const trackingId = data.trackingIdPrefix ? (data.trackingIdPrefix + "-" + String(i).padStart(3, "0")) : null;
      const recutFromId = data.recutFromIds && data.recutFromIds[i - 1] ? data.recutFromIds[i - 1] : null;
      const r = await execute(
        "INSERT INTO tracked_parts (job_id, bom_item_id, work_order_id, tracking_id, identification_type, route_template_id, part_number, description, serial_number, recut_from_id, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [jobId, data.bomItemId || null, data.workOrderId || null, trackingId,
         data.identificationType || "Other", data.routeTemplateId || null,
         data.partNumber || null, data.description || null, i, recutFromId, null]
      );
      createdIds.push(r.lastID);
    }
    const placeholders = createdIds.map(() => "?").join(",");
    const rows = await query<any>(PART_SELECT + " WHERE tp.id IN (" + placeholders + ")", createdIds);
    res.status(201).json({ message: rows.length + " parts created", parts: rows.map(mapPart) });
  } catch (error) {
    logger.error("Error bulk creating tracked parts", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to bulk create tracked parts" });
  }
};
/** PUT /api/tracked-parts/:id */
export const updateTrackedPart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateTrackedPartRequest = req.body;
    const existing = await queryOne<any>("SELECT id FROM tracked_parts WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Tracked part not found" });
    const updates: string[] = [];
    const params: any[] = [];
    if (data.trackingId !== undefined) { updates.push("tracking_id = ?"); params.push(data.trackingId); }
    if (data.identificationType !== undefined) { updates.push("identification_type = ?"); params.push(data.identificationType); }
    if (data.routeTemplateId !== undefined) { updates.push("route_template_id = ?"); params.push(data.routeTemplateId || null); }
    if (data.status !== undefined) {
      updates.push("status = ?"); params.push(data.status);
      if (data.status === "Scrapped") { updates.push("scrapped_at = NOW()"); }
    }
    if (data.scrapReason !== undefined) { updates.push("scrap_reason = ?"); params.push(data.scrapReason); }
    if (data.partNumber !== undefined) { updates.push("part_number = ?"); params.push(data.partNumber); }
    if (data.description !== undefined) { updates.push("description = ?"); params.push(data.description); }
    if (data.notes !== undefined) { updates.push("notes = ?"); params.push(data.notes); }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push("updated_at = NOW()");
    params.push(id);
    await execute("UPDATE tracked_parts SET " + updates.join(", ") + " WHERE id = ?", params);
    const row = await queryOne<any>(PART_SELECT + " WHERE tp.id = ?", [id]);
    res.json(mapPart(row));
  } catch (error) {
    logger.error("Error updating tracked part", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to update tracked part" });
  }
};

/** DELETE /api/tracked-parts/:id */
export const deleteTrackedPart = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await queryOne<any>("SELECT id FROM tracked_parts WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Tracked part not found" });
    await execute("DELETE FROM tracked_parts WHERE id = ?", [id]);
    res.json({ message: "Tracked part deleted successfully" });
  } catch (error) {
    logger.error("Error deleting tracked part", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to delete tracked part" });
  }
};

/** GET /api/jobs/:jobId/tracked-parts/summary */
export const getTrackedPartsSummary = async (req: Request, res: Response) => {
  try {
    const { jobId } = req.params;
    const totalRow = await queryOne<any>("SELECT COUNT(*) as total FROM tracked_parts WHERE job_id = ?", [jobId]);
    const total = totalRow?.total ?? 0;
    const statusRows = await query<any>("SELECT status, COUNT(*) as count FROM tracked_parts WHERE job_id = ? GROUP BY status", [jobId]);
    const byStatus: Record<string, number> = { "Pending": 0, "In Progress": 0, "Completed": 0, "Scrapped": 0, "On Hold": 0 };
    for (const row of statusRows) { byStatus[row.status] = row.count; }
    const stationRows = await query<any>("SELECT rts.station_name, COUNT(DISTINCT tp.id) as count FROM tracked_parts tp JOIN route_template_steps rts ON tp.current_step_id = rts.id WHERE tp.job_id = ? AND tp.status = 'In Progress' GROUP BY rts.station_name", [jobId]);
    const byStation = stationRows.map((r: any) => ({ stationName: r.station_name, count: r.count }));
    res.json({ total, byStatus, byStation } as TrackedPartsSummary);
  } catch (error) {
    logger.error("Error fetching summary", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch tracked parts summary" });
  }
};
/** GET /api/tracked-parts/station/:stationName */
export const getStationQueue = async (req: Request, res: Response) => {
  try {
    const { stationName } = req.params;
    const { jobId, woId } = req.query;
    const woFilter = woId ? " AND tp.work_order_id = ?" : (jobId ? " AND tp.job_id = ?" : "");
    const filterParam = woId || jobId;

    // Parts currently checked in at this station (open log)
    const checkedInParams: any[] = [stationName];
    if (filterParam) checkedInParams.push(filterParam);
    const checkedInRows = await query<any>("SELECT tp.id, tp.job_id, j.job_number, tp.bom_item_id, tp.work_order_id, tp.tracking_id, tp.identification_type, tp.route_template_id, rt.name as route_template_name, tp.current_step_id, rts.station_name as current_station_name, tp.status, tp.part_number, tp.description, tp.serial_number, tp.scrap_reason, tp.scrapped_at, tp.recut_from_id, tp.notes, tp.created_at, tp.updated_at, psl.checked_in_at, psl.operator_name FROM tracked_parts tp LEFT JOIN jobs j ON tp.job_id = j.id LEFT JOIN route_templates rt ON tp.route_template_id = rt.id LEFT JOIN route_template_steps rts ON tp.current_step_id = rts.id INNER JOIN part_station_logs psl ON psl.tracked_part_id = tp.id AND psl.checked_out_at IS NULL WHERE rts.station_name = ? AND tp.status NOT IN ('Completed', 'Scrapped')" + woFilter + " ORDER BY psl.checked_in_at ASC", checkedInParams);
    const checkedIn = checkedInRows.map((r: any) => ({ ...mapPart(r), queueStatus: "checked_in" as const, checkedInAt: r.checked_in_at, operatorName: r.operator_name }));

    // Parts waiting for this station (next step is this station)
    const waitingParams: any[] = [];
    if (filterParam) waitingParams.push(filterParam);
    waitingParams.push(stationName, stationName);
    const waitingRows = await query<any>("SELECT tp.id, tp.job_id, j.job_number, tp.bom_item_id, tp.work_order_id, tp.tracking_id, tp.identification_type, tp.route_template_id, rt.name as route_template_name, tp.current_step_id, cur_rts.station_name as current_station_name, tp.status, tp.part_number, tp.description, tp.serial_number, tp.scrap_reason, tp.scrapped_at, tp.recut_from_id, tp.notes, tp.created_at, tp.updated_at FROM tracked_parts tp LEFT JOIN jobs j ON tp.job_id = j.id LEFT JOIN route_templates rt ON tp.route_template_id = rt.id LEFT JOIN route_template_steps cur_rts ON tp.current_step_id = cur_rts.id WHERE tp.status NOT IN ('Completed', 'Scrapped') AND tp.route_template_id IS NOT NULL" + woFilter + "AND ( (tp.current_step_id IS NULL AND tp.status = 'Pending' AND EXISTS (   SELECT 1 FROM route_template_steps first_step   WHERE first_step.route_template_id = tp.route_template_id AND first_step.station_name = ?   AND first_step.step_order = (SELECT MIN(step_order) FROM route_template_steps WHERE route_template_id = tp.route_template_id) )) OR (tp.current_step_id IS NOT NULL AND cur_rts.station_name = ?   AND NOT EXISTS (SELECT 1 FROM part_station_logs psl2 WHERE psl2.tracked_part_id = tp.id AND psl2.checked_out_at IS NULL) ) ) ORDER BY tp.created_at ASC", waitingParams);
    const waiting = waitingRows.map((r: any) => ({ ...mapPart(r), queueStatus: "waiting" as const }));

    res.json({ checkedIn, waiting });
  } catch (error) {
    logger.error("Error fetching station queue", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch station queue" });
  }
};
/** POST /api/tracked-parts/:id/check-in */
export const checkIn = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: CheckInRequest = req.body;
    if (!data.operatorName) return res.status(400).json({ error: "Operator name is required" });

    const partRow = await queryOne<any>("SELECT id, route_template_id, current_step_id, status FROM tracked_parts WHERE id = ?", [id]);
    if (!partRow) return res.status(404).json({ error: "Tracked part not found" });
    const { route_template_id: routeTemplateId, current_step_id: currentStepId, status } = partRow;

    if (!routeTemplateId) return res.status(400).json({ error: "Part has no route template assigned" });
    if (status === "Completed" || status === "Scrapped") {
      return res.status(400).json({ error: "Cannot check in a part with status: " + status });
    }

    const openLog = await queryOne<any>("SELECT id FROM part_station_logs WHERE tracked_part_id = ? AND checked_out_at IS NULL", [id]);
    if (openLog) return res.status(400).json({ error: "Part is already checked in at a station. Check out first." });

    let nextStepId: number;
    if (!currentStepId) {
      // First step
      const firstStep = await queryOne<any>("SELECT id, step_order, station_name FROM route_template_steps WHERE route_template_id = ? ORDER BY step_order ASC LIMIT 1", [routeTemplateId]);
      if (!firstStep) return res.status(400).json({ error: "Route template has no steps" });
      nextStepId = firstStep.id;
    } else {
      const currentStep = await queryOne<any>("SELECT step_order FROM route_template_steps WHERE id = ?", [currentStepId]);
      if (!currentStep) return res.status(400).json({ error: "Current step not found" });
      const lastLog = await queryOne<any>("SELECT checked_out_at FROM part_station_logs WHERE tracked_part_id = ? AND route_step_id = ? ORDER BY created_at DESC LIMIT 1", [id, currentStepId]);
      if (lastLog && lastLog.checked_out_at) {
        // Current step completed, find next
        const nextStep = await queryOne<any>("SELECT id FROM route_template_steps WHERE route_template_id = ? AND step_order > ? ORDER BY step_order ASC LIMIT 1", [routeTemplateId, currentStep.step_order]);
        if (!nextStep) return res.status(400).json({ error: "Part has completed all route steps" });
        nextStepId = nextStep.id;
      } else {
        // Re-checking into same step
        nextStepId = currentStepId;
      }
    }

    await execute("INSERT INTO part_station_logs (tracked_part_id, route_step_id, operator_name, checked_in_at, notes) VALUES (?, ?, ?, NOW(), ?)", [id, nextStepId, data.operatorName, data.notes || null]);
    await execute("UPDATE tracked_parts SET current_step_id = ?, status = 'In Progress', updated_at = NOW() WHERE id = ?", [nextStepId, id]);

    // Auto-update WO status
    const partInfo = await queryOne<any>("SELECT job_id, work_order_id FROM tracked_parts WHERE id = ?", [id]);
    if (partInfo) {
      if (partInfo.work_order_id) {
        await execute("UPDATE work_orders SET production_status = 'In Progress', production_started_at = NOW(), updated_at = NOW() WHERE id = ? AND production_status = 'Assigned'", [partInfo.work_order_id]);
      } else {
        await execute("UPDATE work_orders SET production_status = 'In Progress', production_started_at = NOW(), updated_at = NOW() WHERE job_id = ? AND production_status = 'Assigned'", [partInfo.job_id]);
      }
    }

    const row = await queryOne<any>(PART_SELECT + " WHERE tp.id = ?", [id]);
    const part = mapPart(row);
    const logs = await query<any>(LOG_SELECT + " WHERE psl.tracked_part_id = ? ORDER BY rts.step_order ASC, psl.checked_in_at ASC", [id]);
    part.stationLogs = logs.map(mapLog);
    res.json(part);
  } catch (error) {
    logger.error("Error checking in", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to check in part" });
  }
};
/** POST /api/tracked-parts/:id/check-out */
export const checkOut = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: CheckOutRequest = req.body;
    if (!data.qualityStatus) return res.status(400).json({ error: "Quality status is required" });

    const openLog = await queryOne<any>("SELECT psl.id, psl.route_step_id, psl.checked_in_at FROM part_station_logs psl WHERE psl.tracked_part_id = ? AND psl.checked_out_at IS NULL ORDER BY psl.created_at DESC LIMIT 1", [id]);
    if (!openLog) return res.status(400).json({ error: "Part is not currently checked in at any station" });

    let timeSpent = data.timeSpentMinutes;
    if (timeSpent === undefined || timeSpent === null) {
      // Auto-calculate from check-in time using PostgreSQL
      const timeRow = await queryOne<any>("SELECT EXTRACT(EPOCH FROM (NOW() - ?::timestamptz)) / 60 as minutes", [openLog.checked_in_at]);
      timeSpent = timeRow ? Math.round(timeRow.minutes * 10) / 10 : 0;
    }

    await execute("UPDATE part_station_logs SET checked_out_at = NOW(), time_spent_minutes = ?, quality_status = ?, notes = COALESCE(?, notes) WHERE id = ?", [timeSpent, data.qualityStatus, data.notes || null, openLog.id]);

    const partRow = await queryOne<any>("SELECT route_template_id, current_step_id FROM tracked_parts WHERE id = ?", [id]);
    const routeTemplateId = partRow?.route_template_id;

    if (data.qualityStatus === "Pass" && routeTemplateId) {
      const currentStepRow = await queryOne<any>("SELECT step_order FROM route_template_steps WHERE id = ?", [openLog.route_step_id]);
      const stepOrder = currentStepRow?.step_order;
      const nextStep = await queryOne<any>("SELECT id FROM route_template_steps WHERE route_template_id = ? AND step_order > ? ORDER BY step_order ASC LIMIT 1", [routeTemplateId, stepOrder]);
      if (nextStep) {
        await execute("UPDATE tracked_parts SET current_step_id = ?, updated_at = NOW() WHERE id = ?", [nextStep.id, id]);
      } else {
        await execute("UPDATE tracked_parts SET status = 'Completed', updated_at = NOW() WHERE id = ?", [id]);
      }
    }

    if (data.qualityStatus === "Fail") {
      await execute("UPDATE tracked_parts SET status = 'On Hold', updated_at = NOW() WHERE id = ?", [id]);
    }

    // Auto-update WO status when all parts completed
    if (data.qualityStatus === "Pass") {
      const partInfo = await queryOne<any>("SELECT job_id, work_order_id FROM tracked_parts WHERE id = ?", [id]);
      if (partInfo) {
        if (partInfo.work_order_id) {
          const totalRow = await queryOne<any>("SELECT COUNT(*) as total FROM tracked_parts WHERE work_order_id = ?", [partInfo.work_order_id]);
          const completedRow = await queryOne<any>("SELECT COUNT(*) as cnt FROM tracked_parts WHERE work_order_id = ? AND status = 'Completed'", [partInfo.work_order_id]);
          if (totalRow?.total > 0 && totalRow.total === completedRow?.cnt) {
            await execute("UPDATE work_orders SET production_status = 'Completed', production_completed_at = NOW(), updated_at = NOW() WHERE id = ? AND production_status = 'In Progress'", [partInfo.work_order_id]);
          }
        } else {
          const totalRow = await queryOne<any>("SELECT COUNT(*) as total FROM tracked_parts WHERE job_id = ?", [partInfo.job_id]);
          const completedRow = await queryOne<any>("SELECT COUNT(*) as cnt FROM tracked_parts WHERE job_id = ? AND status = 'Completed'", [partInfo.job_id]);
          if (totalRow?.total > 0 && totalRow.total === completedRow?.cnt) {
            await execute("UPDATE work_orders SET production_status = 'Completed', production_completed_at = NOW(), updated_at = NOW() WHERE job_id = ? AND production_status = 'In Progress'", [partInfo.job_id]);
          }
        }

        // Auto-complete Production stage if all tracked parts for the job are completed
        const jobTotalRow = await queryOne<any>("SELECT COUNT(*) as total FROM tracked_parts WHERE job_id = ?", [partInfo.job_id]);
        const jobCompletedRow = await queryOne<any>("SELECT COUNT(*) as cnt FROM tracked_parts WHERE job_id = ? AND status = 'Completed'", [partInfo.job_id]);
        if (jobTotalRow?.total > 0 && jobTotalRow.total === jobCompletedRow?.cnt) {
          await autoCompleteStage(partInfo.job_id, 'Production');
        }
      }
    }

    const row = await queryOne<any>(PART_SELECT + " WHERE tp.id = ?", [id]);
    const part = mapPart(row);
    const logs = await query<any>(LOG_SELECT + " WHERE psl.tracked_part_id = ? ORDER BY rts.step_order ASC, psl.checked_in_at ASC", [id]);
    part.stationLogs = logs.map(mapLog);
    res.json(part);
  } catch (error) {
    logger.error("Error checking out", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to check out part" });
  }
};