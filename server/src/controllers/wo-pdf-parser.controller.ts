import { Request, Response } from 'express';
import { query, queryOne } from '../models/database';
import * as fs from 'fs';
import { logger } from '../lib/logger';

// pdf-parse doesn't have types, so we require it
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pdfParse = require('pdf-parse');

interface ParsedPart {
  name: string;
  requested: number;
}

/**
 * Extract parts from Bysoft/Bystronic laser nesting PDF text.
 *
 * After pdf-parse v1 text extraction, the Bysoft "Job List" has repeating blocks like:
 *
 *   15 / 15Requested / Nested    <-- qty comes BEFORE "Requested / Nested"
 *   Description
 *   Name
 *   Auto Part Import
 *   25053-00-0003                <-- part number follows "Auto Part Import"
 *   Cutting Time...
 *   ...
 *
 * Each block has: quantity line, then Name marker, then part number.
 * We extract (partNumber, requested) pairs.
 */
function extractBysoftParts(text: string): ParsedPart[] {
  const parts: ParsedPart[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  let lastRequested: number | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Match quantity line: "X / YRequested / Nested" (no space between Y and "Requested")
    // Examples: "15 / 15Requested / Nested", "4 / 4Requested / Nested"
    const reqMatch = line.match(/^(\d+)\s*\/\s*\d+\s*Requested\s*\/\s*Nested/i);
    if (reqMatch) {
      lastRequested = parseInt(reqMatch[1], 10);
      continue;
    }

    // Also match "Requested / Nested" with qty after (alternate format)
    const reqMatch2 = line.match(/Requested\s*\/\s*Nested\s*(\d+)\s*\/\s*\d+/i);
    if (reqMatch2) {
      lastRequested = parseInt(reqMatch2[1], 10);
      continue;
    }

    // When we see "Name" on its own line, the part number follows after "Auto Part Import"
    if (/^Name$/i.test(line) && lastRequested !== null) {
      // Look ahead for the part number - it comes after "Auto Part Import" or directly after "Name"
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const candidate = lines[j].trim();
        // Skip "Auto Part Import" and "Description" labels
        if (/^(Auto Part Import|Description)$/i.test(candidate)) continue;
        // Part numbers typically have digits and dashes (e.g., 25053-01-0003)
        if (/\d/.test(candidate) && !candidate.startsWith('Cutting') && !candidate.startsWith('Total')) {
          parts.push({ name: candidate, requested: lastRequested });
          lastRequested = null;
          break;
        }
      }
      continue;
    }
  }

  return parts;
}

/**
 * POST /api/jobs/:jobId/work-orders/:woId/parse-pdf
 * Parse the PDF attached to a work order and match parts to BOM items
 */
export async function parsePdf(req: Request, res: Response): Promise<void> {
  try {
    const { jobId, woId } = req.params;

    // Get the first PDF file for this work order
    const fileRecord = await queryOne(
      `SELECT * FROM work_order_files
       WHERE work_order_id = ? AND job_id = ? AND mime_type = 'application/pdf'
       ORDER BY created_at DESC LIMIT 1`,
      [woId, jobId]
    );

    if (!fileRecord) {
      res.status(404).json({ error: 'No PDF file found for this work order' });
      return;
    }

    const filePath = fileRecord.file_path;
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ error: 'PDF file not found on disk' });
      return;
    }

    // Read and parse PDF
    const dataBuffer = fs.readFileSync(filePath);
    const pdfData = await pdfParse(dataBuffer);
    const text = pdfData.text;

    // Extract parts from Bysoft PDF
    const parsedParts = extractBysoftParts(text);

    if (parsedParts.length === 0) {
      res.json({
        message: 'No parts found in PDF. The PDF may not be a Bysoft job list format.',
        parsedParts: [],
        matches: [],
        rawTextPreview: text.substring(0, 500),
      });
      return;
    }

    // Check if this is a recut WO
    const woRecord = await queryOne(
      'SELECT is_recut FROM work_orders WHERE id = ? AND job_id = ?',
      [woId, jobId]
    );
    const isRecut = woRecord ? !!woRecord.is_recut : false;

    // Get BOM items for this job
    const bomRows = await query(
      `SELECT bi.*, rt.name as route_template_name
       FROM bom_items bi
       LEFT JOIN route_templates rt ON bi.route_template_id = rt.id
       WHERE bi.job_id = ?
       ORDER BY bi.part_number`,
      [jobId]
    );

    // If recut WO, get scrapped parts that don't already have a recut
    let scrappedParts: any[] = [];
    if (isRecut) {
      scrappedParts = await query(
        `SELECT tp.id, tp.part_number, tp.bom_item_id, tp.tracking_id, tp.scrap_reason
         FROM tracked_parts tp
         WHERE tp.job_id = ? AND tp.status = 'Scrapped'
           AND NOT EXISTS (
             SELECT 1 FROM tracked_parts r WHERE r.recut_from_id = tp.id
           )
         ORDER BY tp.part_number`,
        [jobId]
      );
    }

    // Match parsed parts to BOM items
    const matches = parsedParts.map((parsed) => {
      // Try exact match first
      let bomMatch = bomRows.find((bom: any) => bom.part_number === parsed.name);

      // Try partial match - BOM part number might be a substring or vice versa
      if (!bomMatch) {
        bomMatch = bomRows.find((bom: any) => {
          const bomPn = (bom.part_number || '').toLowerCase();
          const parsedPn = parsed.name.toLowerCase();
          return bomPn.includes(parsedPn) || parsedPn.includes(bomPn);
        });
      }

      // For recut WOs, cross-reference scrapped parts by part number
      let scrappedPartIds: number[] = [];
      if (isRecut && bomMatch) {
        // Find scrapped parts that match this BOM item
        const matchingScrapped = scrappedParts.filter((sp: any) => sp.bom_item_id === bomMatch.id);
        scrappedPartIds = matchingScrapped.map((sp: any) => sp.id);
      }

      return {
        pdfPartName: parsed.name,
        pdfQuantity: parsed.requested,
        bomItemId: bomMatch ? bomMatch.id : null,
        bomPartNumber: bomMatch ? bomMatch.part_number : null,
        bomDescription: bomMatch ? bomMatch.description : null,
        bomQuantity: bomMatch ? bomMatch.quantity : null,
        matched: !!bomMatch,
        scrappedPartIds,
      };
    });

    res.json({
      message: `Found ${parsedParts.length} parts in PDF, ${matches.filter(m => m.matched).length} matched to BOM`,
      parsedParts,
      matches,
      isRecut,
    });
  } catch (error) {
    logger.error('Error parsing PDF', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to parse PDF' });
  }
}
