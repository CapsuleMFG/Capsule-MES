import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import type { Supplier, CreateSupplierRequest, UpdateSupplierRequest } from '../../../shared/types';

/**
 * Convert database row to Supplier object
 */
function mapRowToSupplier(row: any): Supplier {
    return {
        id: row.id,
        name: row.name,
        contactName: row.contact_name,
        email: row.email,
        phone: row.phone,
        address: row.address,
        paymentTerms: row.payment_terms,
        leadTimeDays: row.lead_time_days,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
    };
}

/**
 * GET /api/suppliers - List all suppliers
 */
export async function getSuppliers(req: Request, res: Response): Promise<void> {
    try {
        const rows = await query('SELECT * FROM suppliers ORDER BY name ASC');
        const suppliers = rows.map(mapRowToSupplier);

        res.json(suppliers);
    } catch (error) {
        console.error('Error fetching suppliers:', error);
        res.status(500).json({ error: 'Failed to fetch suppliers' });
    }
}

/**
 * GET /api/suppliers/:id - Get supplier by ID
 */
export async function getSupplier(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const row = await queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);

        if (!row) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }

        res.json(mapRowToSupplier(row));
    } catch (error) {
        console.error('Error fetching supplier:', error);
        res.status(500).json({ error: 'Failed to fetch supplier' });
    }
}

/**
 * POST /api/suppliers - Create a new supplier
 */
export async function createSupplier(req: Request, res: Response): Promise<void> {
    try {
        const supplierData: CreateSupplierRequest = req.body;

        if (!supplierData.name) {
            res.status(400).json({ error: 'Supplier name is required' });
            return;
        }

        const result = await execute(
            `INSERT INTO suppliers (name, contact_name, email, phone, address, payment_terms, lead_time_days)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
                supplierData.name,
                supplierData.contactName,
                supplierData.email,
                supplierData.phone,
                supplierData.address,
                supplierData.paymentTerms,
                supplierData.leadTimeDays,
            ]
        );

        const newSupplier = await queryOne('SELECT * FROM suppliers WHERE id = ?', [result.lastID]);
        res.status(201).json(mapRowToSupplier(newSupplier));
    } catch (error) {
        console.error('Error creating supplier:', error);
        res.status(500).json({ error: 'Failed to create supplier' });
    }
}

/**
 * PUT /api/suppliers/:id - Update a supplier
 */
export async function updateSupplier(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;
        const updates: UpdateSupplierRequest = req.body;

        // Check if supplier exists
        const existing = await queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }

        const setClauses: string[] = [];
        const values: any[] = [];

        if (updates.name !== undefined) {
            setClauses.push('name = ?');
            values.push(updates.name);
        }
        if (updates.contactName !== undefined) {
            setClauses.push('contact_name = ?');
            values.push(updates.contactName);
        }
        if (updates.email !== undefined) {
            setClauses.push('email = ?');
            values.push(updates.email);
        }
        if (updates.phone !== undefined) {
            setClauses.push('phone = ?');
            values.push(updates.phone);
        }
        if (updates.address !== undefined) {
            setClauses.push('address = ?');
            values.push(updates.address);
        }
        if (updates.paymentTerms !== undefined) {
            setClauses.push('payment_terms = ?');
            values.push(updates.paymentTerms);
        }
        if (updates.leadTimeDays !== undefined) {
            setClauses.push('lead_time_days = ?');
            values.push(updates.leadTimeDays);
        }

        if (setClauses.length === 0) {
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        setClauses.push('updated_at = NOW()');
        values.push(id);

        await execute(
            `UPDATE suppliers SET ${setClauses.join(', ')} WHERE id = ?`,
            values
        );

        const updated = await queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
        res.json(mapRowToSupplier(updated));
    } catch (error) {
        console.error('Error updating supplier:', error);
        res.status(500).json({ error: 'Failed to update supplier' });
    }
}

/**
 * DELETE /api/suppliers/:id - Delete a supplier
 */
export async function deleteSupplier(req: Request, res: Response): Promise<void> {
    try {
        const { id } = req.params;

        const existing = await queryOne('SELECT * FROM suppliers WHERE id = ?', [id]);
        if (!existing) {
            res.status(404).json({ error: 'Supplier not found' });
            return;
        }

        await execute('DELETE FROM suppliers WHERE id = ?', [id]);
        res.status(204).send();
    } catch (error) {
        console.error('Error deleting supplier:', error);
        res.status(500).json({ error: 'Failed to delete supplier' });
    }
}
