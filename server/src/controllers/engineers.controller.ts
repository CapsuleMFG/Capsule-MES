import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import { logger } from '../lib/logger';

export interface Engineer {
    id: number;
    name: string;
    email?: string;
    active: boolean;
    createdAt: string;
}

function mapRowToEngineer(row: any): Engineer {
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        active: !!row.active,
        createdAt: row.created_at,
    };
}

/**
 * GET /api/engineers - List all engineers
 */
export async function getEngineers(req: Request, res: Response): Promise<void> {
    try {
        const activeOnly = req.query.active === 'true';
        const sql = activeOnly
            ? 'SELECT * FROM engineers WHERE active = true ORDER BY name ASC'
            : 'SELECT * FROM engineers ORDER BY name ASC';
        const rows = await query(sql);
        res.json(rows.map(mapRowToEngineer));
    } catch (error) {
        logger.error('Error fetching engineers', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to fetch engineers' });
    }
}

/**
 * POST /api/engineers - Create a new engineer
 */
export async function createEngineer(req: Request, res: Response): Promise<void> {
    try {
        const { name, email } = req.body;

        if (!name || !name.trim()) {
            res.status(400).json({ error: 'Engineer name is required' });
            return;
        }

        const result = await execute(
            'INSERT INTO engineers (name, email) VALUES (?, ?)',
            [name.trim(), email || null]
        );

        const engineer = await queryOne('SELECT * FROM engineers WHERE id = ?', [result.lastID]);
        res.status(201).json(mapRowToEngineer(engineer));
    } catch (error) {
        logger.error('Error creating engineer', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to create engineer' });
    }
}

/**
 * PUT /api/engineers/:id - Update an engineer
 */
export async function updateEngineer(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const { name, email, active } = req.body;

        const existing = await queryOne('SELECT * FROM engineers WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Engineer not found' });
            return;
        }

        const updatedName = name !== undefined ? name.trim() : existing.name;
        const updatedEmail = email !== undefined ? (email || null) : existing.email;
        const updatedActive = active !== undefined ? (active ? 1 : 0) : existing.active;

        if (!updatedName) {
            res.status(400).json({ error: 'Engineer name is required' });
            return;
        }

        await execute(
            'UPDATE engineers SET name = ?, email = ?, active = ? WHERE id = ?',
            [updatedName, updatedEmail, updatedActive, id]
        );

        const engineer = await queryOne('SELECT * FROM engineers WHERE id = ?', [id]);
        res.json(mapRowToEngineer(engineer));
    } catch (error) {
        logger.error('Error updating engineer', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to update engineer' });
    }
}

/**
 * DELETE /api/engineers/:id - Delete an engineer
 */
export async function deleteEngineer(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const existing = await queryOne('SELECT * FROM engineers WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Engineer not found' });
            return;
        }

        await execute('DELETE FROM engineers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        logger.error('Error deleting engineer', { error: error instanceof Error ? error.message : error });
        res.status(500).json({ error: 'Failed to delete engineer' });
    }
}
