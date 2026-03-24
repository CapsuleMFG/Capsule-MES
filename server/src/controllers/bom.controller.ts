import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import * as XLSX from 'xlsx';
import type { BomItem, CreateBomItemRequest, UpdateBomItemRequest } from '../../../shared/types';
import { logger } from '../lib/logger';

interface BomRow {
    partNumber: string;
    description?: string;
    quantity: number;
    unit?: string;
    material?: string;
    thickness?: string;
    surfaceArea?: number;
    powdercoat?: string;
    notes?: string;
}

/**
 * Convert database row to BomItem object
 */
function mapRowToBomItem(row: any): BomItem {
    return {
        id: row.id,
        jobId: row.job_id,
        partNumber: row.part_number,
        description: row.description,
        quantity: row.quantity,
        unit: row.unit,
        material: row.material,
        thickness: row.thickness,
        surfaceArea: row.surface_area,
        powdercoat: row.powdercoat,
        routeTemplateId: row.route_template_id,
        routeTemplateName: row.route_template_name,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/jobs/:jobId/bom - List all BOM items for a job
 */
export async function getBomItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const rows = await query(
            `SELECT bi.*, rt.name as route_template_name
             FROM bom_items bi
             LEFT JOIN route_templates rt ON bi.route_template_id = rt.id
             WHERE bi.job_id = ?
             ORDER BY bi.part_number ASC`,
            [jobId]
        );
        const bomItems = rows.map(mapRowToBomItem);

        res.json(bomItems);
    } catch (error) {
        logger.error('Error fetching BOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch BOM items' });
    }
}

/**
 * POST /api/jobs/:jobId/bom - Add a BOM item to a job
 */
export async function createBomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const bomData: CreateBomItemRequest = req.body;

        if (!bomData.partNumber || !bomData.quantity) {
            res.status(400).json({ error: 'Part number and quantity are required' });
            return;
        }

        // Verify job exists
        const job = await queryOne(
            'SELECT id FROM jobs WHERE id = ?',
            [jobId]
        );
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        const result = await execute(
            `INSERT INTO bom_items (job_id, part_number, description, quantity, unit, material, thickness, surface_area, powdercoat, route_template_id, notes)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                jobId,
                bomData.partNumber,
                bomData.description,
                bomData.quantity,
                bomData.unit || 'EA',
                bomData.material,
                bomData.thickness,
                bomData.surfaceArea,
                bomData.powdercoat,
                bomData.routeTemplateId || null,
                bomData.notes,
            ]
        );

        const newBomItem = await queryOne(
            `SELECT bi.*, rt.name as route_template_name
             FROM bom_items bi
             LEFT JOIN route_templates rt ON bi.route_template_id = rt.id
             WHERE bi.id = ?`,
            [result.lastID]
        );
        if (!newBomItem) {
            res.status(500).json({ error: 'Failed to retrieve created BOM item' });
            return;
        }
        res.status(201).json(mapRowToBomItem(newBomItem));
    } catch (error) {
        logger.error('Error creating BOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create BOM item' });
    }
}

/**
 * PUT /api/jobs/:jobId/bom/:bomId - Update a BOM item
 */
export async function updateBomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, bomId } = req.params;
        const updates: UpdateBomItemRequest = req.body;

        // Check if BOM item exists and belongs to the job
        const existing = await queryOne(
            `SELECT * FROM bom_items WHERE id = ? AND job_id = ?`,
            [bomId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'BOM item not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.partNumber !== undefined) {
            setClauses.push('part_number = ?');
            values.push(updates.partNumber);
        }
        if (updates.description !== undefined) {
            setClauses.push('description = ?');
            values.push(updates.description);
        }
        if (updates.quantity !== undefined) {
            setClauses.push('quantity = ?');
            values.push(updates.quantity);
        }
        if (updates.unit !== undefined) {
            setClauses.push('unit = ?');
            values.push(updates.unit);
        }
        if (updates.material !== undefined) {
            setClauses.push('material = ?');
            values.push(updates.material);
        }
        if (updates.thickness !== undefined) {
            setClauses.push('thickness = ?');
            values.push(updates.thickness);
        }
        if (updates.surfaceArea !== undefined) {
            setClauses.push('surface_area = ?');
            values.push(updates.surfaceArea);
        }
        if (updates.powdercoat !== undefined) {
            setClauses.push('powdercoat = ?');
            values.push(updates.powdercoat);
        }
        if (updates.routeTemplateId !== undefined) {
            setClauses.push('route_template_id = ?');
            values.push(updates.routeTemplateId);
        }
        if (updates.notes !== undefined) {
            setClauses.push('notes = ?');
            values.push(updates.notes);
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClauses.push('updated_at = NOW()');
        values.push(bomId);

        await execute(
            `UPDATE bom_items SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        const updated = await queryOne(
            `SELECT bi.*, rt.name as route_template_name
             FROM bom_items bi
             LEFT JOIN route_templates rt ON bi.route_template_id = rt.id
             WHERE bi.id = ?`,
            [bomId]
        );
        res.json(mapRowToBomItem(updated));
    } catch (error) {
        logger.error('Error updating BOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update BOM item' });
    }
}

/**
 * DELETE /api/jobs/:jobId/bom - Delete all BOM items for a job
 */
export async function deleteAllBomItems(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;

        const items = await query('SELECT id FROM bom_items WHERE job_id = ?', [jobId]);
        if (items.length === 0) {
            res.status(404).json({ error: 'No BOM items found for this job' });
            return;
        }

        await execute('DELETE FROM bom_items WHERE job_id = ?', [jobId]);
        res.json({ message: `Deleted ${items.length} BOM items`, deleted: items.length });
    } catch (error) {
        logger.error('Error deleting all BOM items', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete BOM items' });
    }
}

/**
 * DELETE /api/jobs/:jobId/bom/:bomId - Delete a BOM item
 */
export async function deleteBomItem(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, bomId } = req.params;

        // Check if BOM item exists and belongs to the job
        const existing = await queryOne(
            `SELECT * FROM bom_items WHERE id = ? AND job_id = ?`,
            [bomId, jobId]
        );
        if (!existing) {
            res.status(404).json({ error: 'BOM item not found' });
            return;
        }

        await execute('DELETE FROM bom_items WHERE id = ?', [bomId]);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting BOM item', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete BOM item' });
    }
}

/**
 * POST /api/jobs/:jobId/bom/import - Import BOM items from Excel/CSV
 */
export async function importBom(req: Request, res: Response): Promise<void> {
    try {
        const { jobId } = req.params;
        const file = req.file;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Verify job exists
        const job = await queryOne('SELECT id FROM jobs WHERE id = ?', [jobId]);
        if (!job) {
            res.status(404).json({ error: 'Job not found' });
            return;
        }

        // Parse the file based on its type
        let bomItems: BomRow[];

        try {
            if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
                bomItems = parseBomCsv(file.buffer);
            } else if (
                file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
                file.mimetype === 'application/vnd.ms-excel' ||
                file.originalname.endsWith('.xlsx') ||
                file.originalname.endsWith('.xls')
            ) {
                bomItems = parseBomExcel(file.buffer);
            } else {
                res.status(400).json({ error: 'Unsupported file type. Please upload CSV or Excel file.' });
                return;
            }

            logger.info('[BOM Import] Parsed rows from file', { count: bomItems.length });
            if (bomItems.length > 0) {
                logger.info('[BOM Import] Sample first item', { data: bomItems[0] });
            }
        } catch (parseError) {
            logger.error('Error parsing file', { error: parseError instanceof Error ? parseError.message : parseError });
            res.status(400).json({ error: 'Failed to parse file. Please check the file format.' });
            return;
        }

        if (bomItems.length === 0) {
            res.status(400).json({ error: 'No valid BOM items found in file' });
            return;
        }

        // Upsert BOM items — update existing (by part_number) or insert new
        let insertedCount = 0;
        let updatedCount = 0;

        for (const item of bomItems) {
            if (!item.partNumber || !item.quantity || item.quantity <= 0) {
                logger.warn('Skipping invalid BOM item', { data: item });
                continue;
            }

            try {
                // Check if this part number already exists for this job
                const existing = await queryOne(
                    `SELECT id FROM bom_items WHERE job_id = ? AND part_number = ?`,
                    [jobId, item.partNumber]
                );

                if (existing) {
                    // Update existing item
                    await execute(
                        `UPDATE bom_items
                         SET description = ?, quantity = ?, unit = ?, material = ?, thickness = ?,
                             surface_area = ?, powdercoat = ?, notes = ?, updated_at = NOW()
                         WHERE id = ?`,
                        [
                            item.description || null,
                            item.quantity,
                            item.unit || 'EA',
                            item.material || null,
                            item.thickness || null,
                            item.surfaceArea || null,
                            item.powdercoat || null,
                            item.notes || null,
                            existing.id,
                        ]
                    );
                    updatedCount++;
                } else {
                    // Insert new item
                    await execute(
                        `INSERT INTO bom_items (job_id, part_number, description, quantity, unit, material, thickness, surface_area, powdercoat, notes)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                        [
                            jobId,
                            item.partNumber,
                            item.description || null,
                            item.quantity,
                            item.unit || 'EA',
                            item.material || null,
                            item.thickness || null,
                            item.surfaceArea || null,
                            item.powdercoat || null,
                            item.notes || null,
                        ]
                    );
                    insertedCount++;
                }
            } catch (error) {
                logger.error('Error upserting BOM item', { error: error instanceof Error ? error.message : error });
            }
        }

        const totalCount = insertedCount + updatedCount;
        const parts = [];
        if (insertedCount > 0) parts.push(`${insertedCount} added`);
        if (updatedCount > 0) parts.push(`${updatedCount} updated`);

        res.status(201).json({
            message: `Successfully imported ${totalCount} BOM items (${parts.join(', ')})`,
            itemsImported: totalCount,
            inserted: insertedCount,
            updated: updatedCount,
        });
    } catch (error) {
        logger.error('Error importing BOM', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to import BOM' });
    }
}

/**
 * Helper function to find a value from row by checking multiple column name variations
 */
function findColumnValue(row: any, possibleNames: string[]): any {
    // First try exact matches
    for (const name of possibleNames) {
        if (row[name] !== undefined && row[name] !== null && row[name] !== '') {
            return row[name];
        }
    }

    // Then try normalized matching (case-insensitive, ignore spaces/special chars)
    const normalizeKey = (key: string) =>
        key.toLowerCase().replace(/[\s\/'"`´''""-\.]/g, '').replace(/[\r\n]/g, '');

    const normalizedPossibleNames = possibleNames.map(normalizeKey);
    const rowKeys = Object.keys(row);

    for (const rowKey of rowKeys) {
        const normalizedRowKey = normalizeKey(rowKey);
        if (normalizedPossibleNames.includes(normalizedRowKey)) {
            const value = row[rowKey];
            if (value !== undefined && value !== null && value !== '') {
                return value;
            }
        }
    }

    return undefined;
}

/**
 * Parse a single row to BOM item
 */
function parseBomRow(row: any): BomRow {
    // Part Number
    const partNumber = findColumnValue(row, [
        'Part Number', 'Part #', 'PartNumber', 'part_number', 'partNumber',
        'PART NUMBER', 'Part', 'Item Number', 'Item #'
    ]) || '';

    // Description
    const description = findColumnValue(row, [
        'Description', 'description', 'DESCRIPTION', 'Item', 'Part Description', 'Item Description'
    ]);

    // Quantity
    const quantityValue = findColumnValue(row, [
        'Quantity', 'Qty', 'QTY', 'quantity', 'qty', 'QUANTITY', 'Req Qty', 'Required Qty'
    ]);
    const quantity = quantityValue ? parseFloat(quantityValue.toString()) : 0;

    // Unit
    const unit = findColumnValue(row, [
        'Unit', 'UNIT', 'unit', 'UOM', 'U/M', 'Units'
    ]) || 'EA';

    // Material
    const material = findColumnValue(row, [
        'Material', 'MATERIAL', 'material', 'Mat', 'MAT'
    ]);

    // Thickness
    const thickness = findColumnValue(row, [
        'Thickness', 'THICKNESS', 'thickness', 'Thick', 'Gauge'
    ]);

    // Surface Area
    const surfaceAreaValue = findColumnValue(row, [
        'Surface Area', 'SURFACE AREA', 'surface_area', 'surfaceArea',
        'Surface Area (sqft)', 'Area', 'Sq Ft', 'sqft'
    ]);
    const surfaceArea = surfaceAreaValue ? parseFloat(surfaceAreaValue.toString()) : undefined;

    // Powdercoat
    const powdercoat = findColumnValue(row, [
        'Powdercoat', 'POWDERCOAT', 'powdercoat', 'Powder Coat', 'Coating', 'Finish'
    ]);

    // Notes
    const notes = findColumnValue(row, [
        'Notes', 'notes', 'NOTES', 'Note', 'Comments', 'Remarks'
    ]);

    return {
        partNumber: partNumber ? partNumber.toString().trim() : '',
        description: description ? description.toString().trim() : undefined,
        quantity,
        unit: unit ? unit.toString().trim() : 'EA',
        material: material ? material.toString().trim() : undefined,
        thickness: thickness ? thickness.toString().trim() : undefined,
        surfaceArea,
        powdercoat: powdercoat ? powdercoat.toString().trim() : undefined,
        notes: notes ? notes.toString().trim() : undefined
    };
}

/**
 * Parse CSV file to BOM items
 */
function parseBomCsv(buffer: Buffer): BomRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(worksheet);

    return data.map(row => parseBomRow(row));
}

/**
 * Parse Excel file to BOM items
 * Intelligently finds the BOM data table by looking for expected column headers
 */
function parseBomExcel(buffer: Buffer): BomRow[] {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];

    // Read all data without headers first to find the BOM table
    const allData: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    logger.info('[BOM Excel] Found total rows in sheet', { count: allData.length, sheetName });

    // Find the header row by looking for BOM-specific columns
    let headerRowIndex = -1;
    const bomKeywords = ['part', 'description', 'qty', 'quantity', 'unit', 'item', 'number'];

    for (let i = 0; i < Math.min(allData.length, 20); i++) {
        const row = allData[i];
        if (!row || row.length === 0) continue;

        // Convert row to lowercase and check if it contains BOM keywords
        const rowText = row.map(cell => String(cell || '').toLowerCase()).join(' ');
        const matchCount = bomKeywords.filter(keyword => rowText.includes(keyword)).length;

        // If we find at least 2 BOM keywords, this is likely the header row
        if (matchCount >= 2) {
            headerRowIndex = i;
            logger.info('[BOM Excel] Found BOM header row', { index: i, row });
            break;
        }
    }

    if (headerRowIndex === -1) {
        logger.info('[BOM Excel] Could not find BOM header row, using default parsing');
        // Fall back to default parsing
        const data: any[] = XLSX.utils.sheet_to_json(worksheet);
        return data.map(row => parseBomRow(row));
    }

    // Read data starting from the header row
    const data: any[] = XLSX.utils.sheet_to_json(worksheet, {
        range: headerRowIndex,
        defval: ''
    });

    logger.info('[BOM Excel] Found BOM data rows', { count: data.length, startRow: headerRowIndex + 1 });
    if (data.length > 0) {
        logger.info('[BOM Excel] Column names', { columns: Object.keys(data[0]) });
        logger.info('[BOM Excel] First row raw data', { data: data[0] });
        const parsedFirst = parseBomRow(data[0]);
        logger.info('[BOM Excel] First row parsed result', { data: parsedFirst });
    }

    return data.map(row => parseBomRow(row));
}

/**
 * Export BOM to CSV
 * GET /api/jobs/:jobId/bom/export
 */
/** GET /api/jobs/:jobId/bom/export */
export const exportBomToCsv = async (req: Request, res: Response) => {
    try {
        const { jobId } = req.params;

        // Get job info for filename
        const jobRow = await queryOne<any>("SELECT job_number FROM jobs WHERE id = ?", [jobId]);
        if (!jobRow) {
            return res.status(404).json({ error: "Job not found" });
        }
        const jobNumber = jobRow.job_number;

        // Get BOM items
        const rows = await query<any>(
            "SELECT part_number, description, quantity, unit, material, thickness, surface_area, powdercoat, notes FROM bom_items WHERE job_id = ? ORDER BY id",
            [jobId]
        );

        if (!rows.length) {
            return res.status(404).json({ error: "No BOM items found for this job" });
        }

        // Helper function to escape CSV values
        const escapeCsvValue = (value: any): string => {
            if (value === null || value === undefined) return '';
            const str = String(value);
            if (str.includes(',') || str.includes('"') || str.includes('\n')) {
                return '"' + str.replace(/"/g, '""') + '"';
            }
            return str;
        };

        const headers = ["Part Number", "Description", "Quantity", "Unit", "Material", "Thickness", "Surface Area", "Powdercoat", "Notes"];
        const csvRows = [headers.join(',')];

        for (const row of rows) {
            const vals = [row.part_number, row.description, row.quantity, row.unit, row.material, row.thickness, row.surface_area, row.powdercoat, row.notes];
            csvRows.push(vals.map(escapeCsvValue).join(','));
        }

        const csvContent = csvRows.join('\n');
        const date = new Date().toISOString().split('T')[0];
        const filename = ['BOM_', jobNumber, '_', date, '.csv'].join('');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=' + '"' + filename + '"');
        res.send(csvContent);
    } catch (error) {
        logger.error('Error exporting BOM to CSV', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: "Failed to export BOM" });
    }
};
