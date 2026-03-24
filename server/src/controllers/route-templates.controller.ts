import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type {
  RouteTemplate, RouteTemplateStep, CreateRouteTemplateRequest,
  UpdateRouteTemplateRequest, CreateRouteTemplateStepRequest,
  UpdateRouteTemplateStepRequest, ReorderStepsRequest,
} from '../../../shared/types';
import { logger } from '../lib/logger';

function mapTemplate(row: any): RouteTemplate {
  return { id: row.id, name: row.name, description: row.description,
    stepCount: row.stepCount, createdAt: row.created_at, updatedAt: row.updated_at };
}

function mapStep(row: any): RouteTemplateStep {
  return { id: row.id, routeTemplateId: row.route_template_id, stepOrder: row.step_order,
    stationName: row.station_name, machineId: row.machine_id, machineName: row.machine_name,
    estimatedMinutes: row.estimated_minutes, notes: row.notes,
    createdAt: row.created_at, updatedAt: row.updated_at };
}
/** GET /api/route-templates */
export const getRouteTemplates = async (req: Request, res: Response) => {
  try {
    const rows = await query<any>("SELECT rt.id, rt.name, rt.description, (SELECT COUNT(*) FROM route_template_steps WHERE route_template_id = rt.id) as stepCount, rt.created_at, rt.updated_at FROM route_templates rt ORDER BY rt.name ASC");
    res.json(rows.map(mapTemplate));
  } catch (error) {
    logger.error("Error fetching route templates", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch route templates" });
  }
};

/** GET /api/route-templates/:id */
export const getRouteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const row = await queryOne<any>("SELECT rt.id, rt.name, rt.description, (SELECT COUNT(*) FROM route_template_steps WHERE route_template_id = rt.id) as stepCount, rt.created_at, rt.updated_at FROM route_templates rt WHERE rt.id = ?", [id]);
    if (!row) return res.status(404).json({ error: "Route template not found" });
    const template = mapTemplate(row);
    const stepRows = await query<any>("SELECT rts.id, rts.route_template_id, rts.step_order, rts.station_name, rts.machine_id, m.name as machine_name, rts.estimated_minutes, rts.notes, rts.created_at, rts.updated_at FROM route_template_steps rts LEFT JOIN machines m ON rts.machine_id = m.id WHERE rts.route_template_id = ? ORDER BY rts.step_order ASC", [id]);
    template.steps = stepRows.map(mapStep);
    res.json(template);
  } catch (error) {
    logger.error("Error fetching route template", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to fetch route template" });
  }
};

/** POST /api/route-templates */
export const createRouteTemplate = async (req: Request, res: Response) => {
  try {
    const data: CreateRouteTemplateRequest = req.body;
    if (!data.name) return res.status(400).json({ error: "Template name is required" });
    const existing = await queryOne<any>("SELECT id FROM route_templates WHERE name = ?", [data.name]);
    if (existing) return res.status(400).json({ error: "A route template with this name already exists" });
    const result = await execute("INSERT INTO route_templates (name, description) VALUES (?, ?)", [data.name, data.description || null]);
    const templateId = result.lastID;
    if (data.steps && data.steps.length > 0) {
      for (const step of data.steps) {
        await execute("INSERT INTO route_template_steps (route_template_id, step_order, station_name, machine_id, estimated_minutes, notes) VALUES (?, ?, ?, ?, ?, ?)",
          [templateId, step.stepOrder, step.stationName, step.machineId || null, step.estimatedMinutes || null, step.notes || null]);
      }
    }
    const templateRow = await queryOne<any>("SELECT rt.id, rt.name, rt.description, (SELECT COUNT(*) FROM route_template_steps WHERE route_template_id = rt.id) as stepCount, rt.created_at, rt.updated_at FROM route_templates rt WHERE rt.id = ?", [templateId]);
    const template = mapTemplate(templateRow);
    const stepRows = await query<any>("SELECT rts.id, rts.route_template_id, rts.step_order, rts.station_name, rts.machine_id, m.name as machine_name, rts.estimated_minutes, rts.notes, rts.created_at, rts.updated_at FROM route_template_steps rts LEFT JOIN machines m ON rts.machine_id = m.id WHERE rts.route_template_id = ? ORDER BY rts.step_order ASC", [templateId]);
    template.steps = stepRows.map(mapStep);
    res.status(201).json(template);
  } catch (error) {
    logger.error("Error creating route template", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to create route template" });
  }
};
/** PUT /api/route-templates/:id */
export const updateRouteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateRouteTemplateRequest = req.body;
    const existing = await queryOne<any>("SELECT id FROM route_templates WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Route template not found" });
    if (data.name) {
      const nameCheck = await queryOne<any>("SELECT id FROM route_templates WHERE name = ? AND id != ?", [data.name, id]);
      if (nameCheck) return res.status(400).json({ error: "A route template with this name already exists" });
    }
    const updates: string[] = [];
    const params: any[] = [];
    if (data.name !== undefined) { updates.push("name = ?"); params.push(data.name); }
    if (data.description !== undefined) { updates.push("description = ?"); params.push(data.description); }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push("updated_at = NOW()");
    params.push(id);
    await execute("UPDATE route_templates SET " + updates.join(", ") + " WHERE id = ?", params);
    const row = await queryOne<any>("SELECT rt.id, rt.name, rt.description, (SELECT COUNT(*) FROM route_template_steps WHERE route_template_id = rt.id) as stepCount, rt.created_at, rt.updated_at FROM route_templates rt WHERE rt.id = ?", [id]);
    res.json(mapTemplate(row));
  } catch (error) {
    logger.error("Error updating route template", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to update route template" });
  }
};

/** DELETE /api/route-templates/:id */
export const deleteRouteTemplate = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await queryOne<any>("SELECT id FROM route_templates WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Route template not found" });
    const usage = await queryOne<any>("SELECT COUNT(*) as count FROM tracked_parts WHERE route_template_id = ?", [id]);
    if (usage && usage.count > 0) {
      return res.status(400).json({ error: "Cannot delete route template that is assigned to tracked parts", partCount: usage.count });
    }
    await execute("DELETE FROM route_templates WHERE id = ?", [id]);
    res.json({ message: "Route template deleted successfully" });
  } catch (error) {
    logger.error("Error deleting route template", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to delete route template" });
  }
};
/** POST /api/route-templates/:id/steps */
export const addStep = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: CreateRouteTemplateStepRequest = req.body;
    const existing = await queryOne<any>("SELECT id FROM route_templates WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Route template not found" });
    if (!data.stationName) return res.status(400).json({ error: "Station name is required" });
    let stepOrder = data.stepOrder;
    if (stepOrder === undefined || stepOrder === null) {
      const maxRow = await queryOne<any>("SELECT COALESCE(MAX(step_order), 0) as maxOrder FROM route_template_steps WHERE route_template_id = ?", [id]);
      stepOrder = (maxRow?.maxOrder ?? 0) + 1;
    }
    const stepResult = await execute(
      "INSERT INTO route_template_steps (route_template_id, step_order, station_name, machine_id, estimated_minutes, notes) VALUES (?, ?, ?, ?, ?, ?)",
      [id, stepOrder, data.stationName, data.machineId || null, data.estimatedMinutes || null, data.notes || null]
    );
    await execute("UPDATE route_templates SET updated_at = NOW() WHERE id = ?", [id]);
    const stepRow = await queryOne<any>("SELECT rts.id, rts.route_template_id, rts.step_order, rts.station_name, rts.machine_id, m.name as machine_name, rts.estimated_minutes, rts.notes, rts.created_at, rts.updated_at FROM route_template_steps rts LEFT JOIN machines m ON rts.machine_id = m.id WHERE rts.id = ?", [stepResult.lastID]);
    res.status(201).json(mapStep(stepRow));
  } catch (error) {
    logger.error("Error adding step", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to add step" });
  }
};

/** PUT /api/route-templates/:id/steps/:stepId */
export const updateStep = async (req: Request, res: Response) => {
  try {
    const { id, stepId } = req.params;
    const data: UpdateRouteTemplateStepRequest = req.body;
    const existing = await queryOne<any>("SELECT id FROM route_template_steps WHERE id = ? AND route_template_id = ?", [stepId, id]);
    if (!existing) return res.status(404).json({ error: "Step not found" });
    const updates: string[] = [];
    const params: any[] = [];
    if (data.stationName !== undefined) { updates.push("station_name = ?"); params.push(data.stationName); }
    if (data.machineId !== undefined) { updates.push("machine_id = ?"); params.push(data.machineId || null); }
    if (data.estimatedMinutes !== undefined) { updates.push("estimated_minutes = ?"); params.push(data.estimatedMinutes); }
    if (data.notes !== undefined) { updates.push("notes = ?"); params.push(data.notes); }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push("updated_at = NOW()");
    params.push(stepId);
    await execute("UPDATE route_template_steps SET " + updates.join(", ") + " WHERE id = ?", params);
    await execute("UPDATE route_templates SET updated_at = NOW() WHERE id = ?", [id]);
    const stepRow = await queryOne<any>("SELECT rts.id, rts.route_template_id, rts.step_order, rts.station_name, rts.machine_id, m.name as machine_name, rts.estimated_minutes, rts.notes, rts.created_at, rts.updated_at FROM route_template_steps rts LEFT JOIN machines m ON rts.machine_id = m.id WHERE rts.id = ?", [stepId]);
    res.json(mapStep(stepRow));
  } catch (error) {
    logger.error("Error updating step", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to update step" });
  }
};

/** DELETE /api/route-templates/:id/steps/:stepId */
export const deleteStep = async (req: Request, res: Response) => {
  try {
    const { id, stepId } = req.params;
    const existing = await queryOne<any>("SELECT id FROM route_template_steps WHERE id = ? AND route_template_id = ?", [stepId, id]);
    if (!existing) return res.status(404).json({ error: "Step not found" });
    await execute("DELETE FROM route_template_steps WHERE id = ?", [stepId]);
    await execute("UPDATE route_templates SET updated_at = NOW() WHERE id = ?", [id]);
    res.json({ message: "Step deleted successfully" });
  } catch (error) {
    logger.error("Error deleting step", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to delete step" });
  }
};

/** PUT /api/route-templates/:id/steps/reorder */
export const reorderSteps = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: ReorderStepsRequest = req.body;
    if (!data.stepIds || !Array.isArray(data.stepIds)) return res.status(400).json({ error: "stepIds array is required" });
    for (let i = 0; i < data.stepIds.length; i++) {
      await execute("UPDATE route_template_steps SET step_order = ?, updated_at = NOW() WHERE id = ? AND route_template_id = ?", [i + 1, data.stepIds[i], id]);
    }
    await execute("UPDATE route_templates SET updated_at = NOW() WHERE id = ?", [id]);
    const stepRows = await query<any>("SELECT rts.id, rts.route_template_id, rts.step_order, rts.station_name, rts.machine_id, m.name as machine_name, rts.estimated_minutes, rts.notes, rts.created_at, rts.updated_at FROM route_template_steps rts LEFT JOIN machines m ON rts.machine_id = m.id WHERE rts.route_template_id = ? ORDER BY rts.step_order ASC", [id]);
    res.json(stepRows.map(mapStep));
  } catch (error) {
    logger.error("Error reordering steps", { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: "Failed to reorder steps" });
  }
};