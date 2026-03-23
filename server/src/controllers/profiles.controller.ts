import { Request, Response } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { query, queryOne } from '../models/database';
import { logAudit } from '../middleware/audit';
import bcrypt from 'bcrypt';
import { logger } from '../lib/logger';
import { validatePassword } from '../lib/validation';

interface ProfileRow {
  id: string;
  name: string;
  role: string;
  pin: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  email?: string;
}

function mapProfile(row: ProfileRow) {
  return {
    id: row.id,
    email: row.email || '',
    name: row.name,
    role: row.role,
    pin: row.pin ? '••••' : null,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// GET /api/profiles — list all users (admin only)
export const getProfiles = async (req: Request, res: Response): Promise<void> => {
  try {
    const rows = await query<ProfileRow>(
      `SELECT p.*, u.email
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       ORDER BY p.name`
    );
    res.json(rows.map(mapProfile));
  } catch (error) {
    logger.error('Error fetching profiles', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch profiles' });
  }
};

// GET /api/profiles/:id — get single profile (admin only)
export const getProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email
       FROM profiles p
       JOIN auth.users u ON u.id = p.id
       WHERE p.id = $1`,
      [id]
    );
    if (!row) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(mapProfile(row));
  } catch (error) {
    logger.error('Error fetching profile', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};

// POST /api/profiles — create new user (admin only)
// Creates auth.users entry via Supabase Admin API, profile auto-created by trigger
export const createProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { email, password, name, role, pin } = req.body;

    if (!email || !password || !name || !role) {
      res.status(400).json({ error: 'Email, password, name, and role are required' });
      return;
    }

    const validRoles = ['admin', 'manager', 'engineer', 'supply_chain', 'operator'];
    if (!validRoles.includes(role)) {
      res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.valid) {
      res.status(400).json({ error: passwordCheck.error });
      return;
    }

    // Create auth user (trigger auto-creates profile row)
    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm for internal tool
      user_metadata: { name, role },
    });

    if (error) {
      res.status(400).json({ error: error.message });
      return;
    }

    const userId = data.user.id;

    // Update profile with correct name and role (trigger sets defaults from metadata)
    await query(
      `UPDATE profiles SET name = $1, role = $2, updated_at = NOW() WHERE id = $3`,
      [name, role, userId]
    );

    // Set PIN if provided
    if (pin) {
      const hashedPin = await bcrypt.hash(pin, 10);
      await query('UPDATE profiles SET pin = $1 WHERE id = $2', [hashedPin, userId]);
    }

    // Fetch and return the created profile
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [userId]
    );

    await logAudit({
      user: req.user,
      action: 'CREATE',
      tableName: 'profiles',
      recordId: userId,
      newValues: { email, name, role },
    });

    res.status(201).json(mapProfile(row!));
  } catch (error) {
    logger.error('Error creating profile', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to create user' });
  }
};

// PUT /api/profiles/:id — update profile (admin only)
export const updateProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name, role, pin, isActive } = req.body;

    const existing = await queryOne<ProfileRow>('SELECT * FROM profiles WHERE id = $1', [id]);
    if (!existing) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }

    const updates: string[] = [];
    const params: (string | boolean | null)[] = [];
    let paramIdx = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIdx++}`);
      params.push(name);
    }
    if (role !== undefined) {
      const validRoles = ['admin', 'manager', 'engineer', 'supply_chain', 'operator'];
      if (!validRoles.includes(role)) {
        res.status(400).json({ error: `Invalid role. Must be one of: ${validRoles.join(', ')}` });
        return;
      }
      updates.push(`role = $${paramIdx++}`);
      params.push(role);
    }
    if (pin !== undefined) {
      const hashedPin = pin ? await bcrypt.hash(pin, 10) : null;
      updates.push(`pin = $${paramIdx++}`);
      params.push(hashedPin);
    }
    if (isActive !== undefined) {
      updates.push(`is_active = $${paramIdx++}`);
      params.push(isActive);
    }

    if (updates.length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    updates.push(`updated_at = NOW()`);
    params.push(id);

    await query(
      `UPDATE profiles SET ${updates.join(', ')} WHERE id = $${paramIdx}`,
      params
    );

    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [id]
    );

    await logAudit({
      user: req.user,
      action: 'UPDATE',
      tableName: 'profiles',
      recordId: id,
      oldValues: { name: existing.name, role: existing.role, is_active: existing.is_active },
      newValues: { name: row!.name, role: row!.role, is_active: row!.is_active },
    });

    res.json(mapProfile(row!));
  } catch (error) {
    logger.error('Error updating profile', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to update profile' });
  }
};

// GET /api/profiles/me — get current user's profile
export const getMyProfile = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    const row = await queryOne<ProfileRow>(
      `SELECT p.*, u.email FROM profiles p JOIN auth.users u ON u.id = p.id WHERE p.id = $1`,
      [req.user.id]
    );
    if (!row) {
      res.status(404).json({ error: 'Profile not found' });
      return;
    }
    res.json(mapProfile(row));
  } catch (error) {
    logger.error('Error fetching my profile', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
};
