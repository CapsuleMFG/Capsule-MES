import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { Client, CreateClientRequest } from '../../../shared/types';

/**
 * Convert database row to Client object
 */
function mapRowToClient(row: any): Client {
    return {
        id: row.id,
        name: row.name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/clients - List all clients
 */
export async function getClients(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query('SELECT * FROM clients ORDER BY name ASC');
        const clients = rows.map(mapRowToClient);

        res.json(clients);
    } catch (error) {
        console.error('Error fetching clients:', error);
        res.status(500).json({ error: 'Failed to fetch clients' });
    }
}

/**
 * POST /api/clients - Create a new client
 */
export async function createClient(req: Request, res: Response): Promise<void> {
    try {
        const clientData: CreateClientRequest = req.body;

        if (!clientData.name) {
            res.status(400).json({ error: 'Client name is required' });
            return;
        }

        const result = await execute(
            `INSERT INTO clients (name, contact_name, email, phone, address)
             VALUES (?, ?, ?, ?, ?)`,
            [
                clientData.name,
                clientData.contactName || null,
                clientData.email || null,
                clientData.phone || null,
                clientData.address || null
            ]
        );

        const client = await queryOne(
            'SELECT * FROM clients WHERE id = ?',
            [result.lastID]
        );

        res.status(201).json(mapRowToClient(client));
    } catch (error) {
        console.error('Error creating client:', error);
        res.status(500).json({ error: 'Failed to create client' });
    }
}

/**
 * GET /api/clients/:id - Get client by ID
 */
export async function getClientById(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const client = await queryOne('SELECT * FROM clients WHERE id = ?', [id]);

        if (!client) {
            res.status(404).json({ error: 'Client not found' });
            return;
        }

        res.json(mapRowToClient(client));
    } catch (error) {
        console.error('Error fetching client:', error);
        res.status(500).json({ error: 'Failed to fetch client' });
    }
}

/**
 * PUT /api/clients/:id - Update client
 */
export async function updateClient(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates = req.body;

        const allowedFields = ['name', 'contact_name', 'email', 'phone', 'address'];
        const setClause: string[] = [];
        const params: any[] = [];

        for (const [key, value] of Object.entries(updates)) {
            const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
            if (allowedFields.includes(snakeKey)) {
                setClause.push(`${snakeKey} = ?`);
                params.push(value);
            }
        }

        if (setClause.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClause.push('updated_at = NOW()');
        params.push(id);

        await execute(
            `UPDATE clients SET ${setClause.join(', ')} WHERE id = ?`,
            params
        );

        const client = await queryOne('SELECT * FROM clients WHERE id = ?', [id]);

        res.json(mapRowToClient(client));
    } catch (error) {
        console.error('Error updating client:', error);
        res.status(500).json({ error: 'Failed to update client' });
    }
}

/**
 * DELETE /api/clients/:id - Delete client
 */
export async function deleteClient(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        // Check if client has associated jobs
        const jobsCount = await queryOne<{ count: number }>(
            'SELECT COUNT(*) as count FROM jobs WHERE client_id = ?',
            [id]
        );

        if (jobsCount && jobsCount.count > 0) {
            res.status(400).json({
                error: 'Cannot delete client with associated jobs',
                jobsCount: jobsCount.count
            });
            return;
        }

        await execute('DELETE FROM clients WHERE id = ?', [id]);

        res.status(204).send();
    } catch (error) {
        console.error('Error deleting client:', error);
        res.status(500).json({ error: 'Failed to delete client' });
    }
}
