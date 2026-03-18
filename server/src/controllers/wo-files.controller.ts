import { Request, Response } from 'express';
import { execute, query, queryOne } from '../models/database';
import * as path from 'path';
import * as fs from 'fs';

/**
 * POST /api/jobs/:jobId/work-orders/:woId/files
 * Upload a file to a work order
 */
export async function uploadWorkOrderFile(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId } = req.params;
        const file = req.file;
        const { uploadedBy } = req.body;

        if (!file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }

        // Store file metadata in database
        await execute(
            `INSERT INTO work_order_files (
                work_order_id, job_id, filename, original_filename,
                file_path, file_size, mime_type, uploaded_by
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                woId,
                jobId,
                file.filename,
                file.originalname,
                file.path,
                file.size,
                file.mimetype,
                uploadedBy || null
            ]
        );

        // Fetch the newly created file record
        const fileRecord = await queryOne(
            `SELECT * FROM work_order_files
             WHERE work_order_id = ? AND filename = ?
             ORDER BY created_at DESC LIMIT 1`,
            [woId, file.filename]
        );

        res.status(201).json({
            message: 'File uploaded successfully',
            file: {
                id: fileRecord.id,
                workOrderId: fileRecord.work_order_id,
                jobId: fileRecord.job_id,
                filename: fileRecord.filename,
                originalFilename: fileRecord.original_filename,
                fileSize: fileRecord.file_size,
                mimeType: fileRecord.mime_type,
                uploadedBy: fileRecord.uploaded_by,
                createdAt: fileRecord.created_at,
            }
        });
    } catch (error) {
        console.error('Error uploading file:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
}

/**
 * GET /api/jobs/:jobId/work-orders/:woId/files
 * Get all files for a work order
 */
export async function getWorkOrderFiles(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId } = req.params;

        const rows = await query(
            `SELECT * FROM work_order_files
             WHERE job_id = ? AND work_order_id = ?
             ORDER BY created_at DESC`,
            [jobId, woId]
        );

        const files = rows.map((row: any) => ({
            id: row.id,
            workOrderId: row.work_order_id,
            jobId: row.job_id,
            filename: row.filename,
            originalFilename: row.original_filename,
            fileSize: row.file_size,
            mimeType: row.mime_type,
            uploadedBy: row.uploaded_by,
            createdAt: row.created_at,
        }));

        res.json(files);
    } catch (error) {
        console.error('Error fetching files:', error);
        res.status(500).json({ error: 'Failed to fetch files' });
    }
}

/**
 * GET /api/jobs/:jobId/work-orders/:woId/files/:fileId/download
 * Download a work order file
 */
export async function downloadWorkOrderFile(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId, fileId } = req.params;

        const fileRecord = await queryOne(
            `SELECT * FROM work_order_files
             WHERE id = ? AND job_id = ? AND work_order_id = ?`,
            [fileId, jobId, woId]
        );

        if (!fileRecord) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        const filePath = fileRecord.file_path;
        const uploadsDir = path.resolve(__dirname, '../../uploads');
        const resolvedPath = path.resolve(filePath);

        if (!resolvedPath.startsWith(uploadsDir + path.sep)) {
            res.status(403).json({ error: 'Access denied' });
            return;
        }

        if (!fs.existsSync(resolvedPath)) {
            res.status(404).json({ error: 'File not found on disk' });
            return;
        }

        res.download(resolvedPath, fileRecord.original_filename);
    } catch (error) {
        console.error('Error downloading file:', error);
        res.status(500).json({ error: 'Failed to download file' });
    }
}

/**
 * DELETE /api/jobs/:jobId/work-orders/:woId/files/:fileId
 * Delete a work order file
 */
export async function deleteWorkOrderFile(req: Request, res: Response): Promise<void> {
    try {
        const { jobId, woId, fileId } = req.params;

        const fileRecord = await queryOne(
            `SELECT * FROM work_order_files
             WHERE id = ? AND job_id = ? AND work_order_id = ?`,
            [fileId, jobId, woId]
        );

        if (!fileRecord) {
            res.status(404).json({ error: 'File not found' });
            return;
        }

        // Delete file from disk
        if (fs.existsSync(fileRecord.file_path)) {
            fs.unlinkSync(fileRecord.file_path);
        }

        // Delete from database
        await execute(
            `DELETE FROM work_order_files WHERE id = ?`,
            [fileId]
        );

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting file:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
}
