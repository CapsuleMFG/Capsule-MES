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
  category?: string;
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

// ---------------------------------------------------------------------------
// Shared SELECT fragment
// ---------------------------------------------------------------------------
const SHIPMENT_SELECT = `
  SELECT s.*,
         j.job_number,
         j.description AS job_description,
         COALESCE(c.name, 'No Client') AS client_name
  FROM shipments s
  JOIN jobs j ON s.job_id = j.id
  LEFT JOIN clients c ON j.client_id = c.id`;

// ---------------------------------------------------------------------------
// Map a DB row to a camelCase response object
// ---------------------------------------------------------------------------
function mapRow(row: any) {
  return {
    id: row.id,
    jobId: row.job_id,
    jobNumber: row.job_number,
    jobDescription: row.job_description,
    clientName: row.client_name,
    status: row.status,
    shippingMethod: row.shipping_method,
    trackingNumber: row.tracking_number,
    carrier: row.carrier,
    shipDate: row.ship_date,
    deliveryDate: row.delivery_date,
    shippingNotes: row.shipping_notes,
    packedBy: row.packed_by,
    shippedBy: row.shipped_by,
    packingList: row.packing_list ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ---------------------------------------------------------------------------
// GET /api/shipments — list all shipments (optional ?status=&jobId=)
// ---------------------------------------------------------------------------
export async function getShipments(req: Request, res: Response): Promise<void> {
  try {
    const { status, jobId } = req.query;
    let sql = SHIPMENT_SELECT;
    const conditions: string[] = [];
    const params: any[] = [];

    if (status) {
      conditions.push('s.status = ?');
      params.push(status);
    }
    if (jobId) {
      conditions.push('s.job_id = ?');
      params.push(jobId);
    }

    if (conditions.length) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    sql += ' ORDER BY s.created_at DESC';

    const rows = await query<any>(sql, params);
    res.json(rows.map(mapRow));
  } catch (error) {
    logger.error('Error fetching shipments', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch shipments' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/shipments/:id — single shipment
// ---------------------------------------------------------------------------
export async function getShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const row = await queryOne<any>(`${SHIPMENT_SELECT} WHERE s.id = ?`, [id]);
    if (!row) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }
    res.json(mapRow(row));
  } catch (error) {
    logger.error('Error fetching shipment', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch shipment' });
  }
}

// ---------------------------------------------------------------------------
// GET /api/shipments/job/:jobId — shipment for a specific job
// ---------------------------------------------------------------------------
export async function getShipmentByJob(req: Request, res: Response): Promise<void> {
  try {
    const { jobId } = req.params;
    const row = await queryOne<any>(`${SHIPMENT_SELECT} WHERE s.job_id = ?`, [jobId]);
    if (!row) {
      res.status(404).json({ error: 'No shipment found for this job' });
      return;
    }
    res.json(mapRow(row));
  } catch (error) {
    logger.error('Error fetching shipment by job', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch shipment for job' });
  }
}

// ---------------------------------------------------------------------------
// POST /api/shipments — create a shipment (auto-generates packing list)
// ---------------------------------------------------------------------------
export async function createShipment(req: Request, res: Response): Promise<void> {
  try {
    const { jobId, shippingMethod, carrier, shippingNotes, packedBy } = req.body;

    if (!jobId) {
      res.status(400).json({ error: 'jobId is required' });
      return;
    }

    // Verify job exists
    const job = await queryOne<any>('SELECT id, job_number FROM jobs WHERE id = ?', [jobId]);
    if (!job) {
      res.status(404).json({ error: 'Job not found' });
      return;
    }

    // Check no existing shipment for this job
    const existing = await queryOne<any>('SELECT id FROM shipments WHERE job_id = ?', [jobId]);
    if (existing) {
      res.status(409).json({ error: 'A shipment already exists for this job' });
      return;
    }

    // Auto-generate packing list from completed tracked parts
    const completedParts = await query<any>(
      `SELECT id, tracking_id, part_number, description, serial_number
       FROM tracked_parts
       WHERE job_id = ? AND status = 'Completed'
       ORDER BY part_number, tracking_id`,
      [jobId]
    );

    const packingList = completedParts.map((p: any) => ({
      trackedPartId: p.id,
      trackingId: p.tracking_id,
      partNumber: p.part_number,
      description: p.description,
      serialNumber: p.serial_number,
    }));

    const result = await execute(
      `INSERT INTO shipments (job_id, status, shipping_method, carrier, shipping_notes, packed_by, packing_list)
       VALUES (?, 'Pending', ?, ?, ?, ?, ?::jsonb)`,
      [
        jobId,
        shippingMethod ?? null,
        carrier ?? null,
        shippingNotes ?? null,
        packedBy ?? null,
        JSON.stringify(packingList),
      ]
    );

    // Fetch the created shipment
    const created = await queryOne<any>(`${SHIPMENT_SELECT} WHERE s.id = ?`, [result.lastID]);
    res.status(201).json(mapRow(created));
  } catch (error) {
    logger.error('Error creating shipment', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to create shipment' });
  }
}

// ---------------------------------------------------------------------------
// PUT /api/shipments/:id — update shipment fields
// ---------------------------------------------------------------------------
export async function updateShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await queryOne<any>('SELECT * FROM shipments WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    const {
      status,
      shippingMethod,
      trackingNumber,
      carrier,
      shipDate,
      deliveryDate,
      shippingNotes,
      packedBy,
      shippedBy,
      packingList,
    } = req.body;

    // Determine dates based on status transitions
    let resolvedShipDate = shipDate !== undefined ? shipDate : existing.ship_date;
    let resolvedDeliveryDate = deliveryDate !== undefined ? deliveryDate : existing.delivery_date;

    if (status === 'Shipped' && existing.status !== 'Shipped' && !shipDate && !existing.ship_date) {
      resolvedShipDate = new Date().toISOString();
    }
    if (status === 'Delivered' && existing.status !== 'Delivered' && !deliveryDate && !existing.delivery_date) {
      resolvedDeliveryDate = new Date().toISOString();
    }

    await execute(
      `UPDATE shipments
       SET status = ?,
           shipping_method = ?,
           tracking_number = ?,
           carrier = ?,
           ship_date = ?,
           delivery_date = ?,
           shipping_notes = ?,
           packed_by = ?,
           shipped_by = ?,
           packing_list = ?::jsonb,
           updated_at = NOW()
       WHERE id = ?`,
      [
        status ?? existing.status,
        shippingMethod !== undefined ? shippingMethod : existing.shipping_method,
        trackingNumber !== undefined ? trackingNumber : existing.tracking_number,
        carrier !== undefined ? carrier : existing.carrier,
        resolvedShipDate,
        resolvedDeliveryDate,
        shippingNotes !== undefined ? shippingNotes : existing.shipping_notes,
        packedBy !== undefined ? packedBy : existing.packed_by,
        shippedBy !== undefined ? shippedBy : existing.shipped_by,
        packingList !== undefined ? JSON.stringify(packingList) : JSON.stringify(existing.packing_list ?? []),
        id,
      ]
    );

    // Create notification when status changes to Shipped
    if (status === 'Shipped' && existing.status !== 'Shipped') {
      const job = await queryOne<any>('SELECT job_number FROM jobs WHERE id = ?', [existing.job_id]);
      const jobLabel = job ? job.job_number : `Job #${existing.job_id}`;
      await createNotification({
        title: 'Shipment Shipped',
        message: `${jobLabel} has been shipped${trackingNumber || existing.tracking_number ? ` — tracking: ${trackingNumber || existing.tracking_number}` : ''}.`,
        type: 'success',
        category: 'shipment',
        referenceType: 'shipment',
        referenceId: Number(id),
      });
    }

    const updated = await queryOne<any>(`${SHIPMENT_SELECT} WHERE s.id = ?`, [id]);
    res.json(mapRow(updated));
  } catch (error) {
    logger.error('Error updating shipment', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update shipment' });
  }
}

// ---------------------------------------------------------------------------
// DELETE /api/shipments/:id
// ---------------------------------------------------------------------------
export async function deleteShipment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await queryOne<any>('SELECT id FROM shipments WHERE id = ?', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Shipment not found' });
      return;
    }

    await execute('DELETE FROM shipments WHERE id = ?', [id]);
    res.json({ message: 'Shipment deleted' });
  } catch (error) {
    logger.error('Error deleting shipment', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to delete shipment' });
  }
}
