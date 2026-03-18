import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { query, queryOne, execute } from "../models/database";
import type { StationKiosk, CreateStationKioskRequest, UpdateStationKioskRequest, StationAuthRequest } from "../../../shared/types";

const BCRYPT_ROUNDS = 10;

function mapKiosk(row: any, includePinCode = false): StationKiosk {
  return { id: row.id, stationName: row.station_name, pinCode: includePinCode ? row.pin_code : '••••',
    machineId: row.machine_id, machineName: row.machine_name, isActive: !!row.is_active,
    notes: row.notes, createdAt: row.created_at, updatedAt: row.updated_at };
}

/** GET /api/station-kiosks */
export const getStationKiosks = async (_req: Request, res: Response) => {
  try {
    const rows = await query<any>("SELECT sk.id, sk.station_name, sk.pin_code, sk.machine_id, m.name as machine_name, sk.is_active, sk.notes, sk.created_at, sk.updated_at FROM station_kiosks sk LEFT JOIN machines m ON sk.machine_id = m.id ORDER BY sk.station_name ASC");
    res.json(rows.map(row => mapKiosk(row)));
  } catch (error) {
    console.error("Error fetching station kiosks:", error);
    res.status(500).json({ error: "Failed to fetch station kiosks" });
  }
};

/** POST /api/station-kiosks */
export const createStationKiosk = async (req: Request, res: Response) => {
  try {
    const data: CreateStationKioskRequest = req.body;
    if (!data.stationName || !data.pinCode) return res.status(400).json({ error: "Station name and PIN code are required" });
    if (!/^\d{4,6}$/.test(data.pinCode)) return res.status(400).json({ error: "PIN code must be 4-6 digits" });
    const existing = await queryOne<any>("SELECT id FROM station_kiosks WHERE station_name = ?", [data.stationName]);
    if (existing) return res.status(400).json({ error: "Station name already exists" });
    const pinHash = await bcrypt.hash(data.pinCode, BCRYPT_ROUNDS);
    const result = await execute("INSERT INTO station_kiosks (station_name, pin_code, machine_id, is_active, notes) VALUES (?, ?, ?, ?, ?)",
      [data.stationName, pinHash, data.machineId || null, data.isActive !== false, data.notes || null]);
    const row = await queryOne<any>("SELECT sk.id, sk.station_name, sk.pin_code, sk.machine_id, m.name as machine_name, sk.is_active, sk.notes, sk.created_at, sk.updated_at FROM station_kiosks sk LEFT JOIN machines m ON sk.machine_id = m.id WHERE sk.id = ?", [result.lastID]);
    res.status(201).json(mapKiosk(row));
  } catch (error) {
    console.error("Error creating station kiosk:", error);
    res.status(500).json({ error: "Failed to create station kiosk" });
  }
};

/** PUT /api/station-kiosks/:id */
export const updateStationKiosk = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const data: UpdateStationKioskRequest = req.body;
    const existing = await queryOne<any>("SELECT id FROM station_kiosks WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Station kiosk not found" });
    const updates: string[] = [];
    const params: any[] = [];
    if (data.stationName !== undefined) {
      const dup = await queryOne<any>("SELECT id FROM station_kiosks WHERE station_name = ? AND id != ?", [data.stationName, id]);
      if (dup) return res.status(400).json({ error: "Station name already exists" });
      updates.push("station_name = ?"); params.push(data.stationName);
    }
    if (data.pinCode !== undefined) {
      if (!/^\d{4,6}$/.test(data.pinCode)) return res.status(400).json({ error: "PIN code must be 4-6 digits" });
      const pinHash = await bcrypt.hash(data.pinCode, BCRYPT_ROUNDS);
      updates.push("pin_code = ?"); params.push(pinHash);
    }
    if (data.machineId !== undefined) { updates.push("machine_id = ?"); params.push(data.machineId); }
    if (data.isActive !== undefined) { updates.push("is_active = ?"); params.push(data.isActive !== false); }
    if (data.notes !== undefined) { updates.push("notes = ?"); params.push(data.notes); }
    if (updates.length === 0) return res.status(400).json({ error: "No fields to update" });
    updates.push("updated_at = NOW()");
    params.push(id);
    await execute("UPDATE station_kiosks SET " + updates.join(", ") + " WHERE id = ?", params);
    const row = await queryOne<any>("SELECT sk.id, sk.station_name, sk.pin_code, sk.machine_id, m.name as machine_name, sk.is_active, sk.notes, sk.created_at, sk.updated_at FROM station_kiosks sk LEFT JOIN machines m ON sk.machine_id = m.id WHERE sk.id = ?", [id]);
    res.json(mapKiosk(row));
  } catch (error) {
    console.error("Error updating station kiosk:", error);
    res.status(500).json({ error: "Failed to update station kiosk" });
  }
};

/** DELETE /api/station-kiosks/:id */
export const deleteStationKiosk = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const existing = await queryOne<any>("SELECT id FROM station_kiosks WHERE id = ?", [id]);
    if (!existing) return res.status(404).json({ error: "Station kiosk not found" });
    await execute("DELETE FROM station_kiosks WHERE id = ?", [id]);
    res.json({ message: "Station kiosk deleted successfully" });
  } catch (error) {
    console.error("Error deleting station kiosk:", error);
    res.status(500).json({ error: "Failed to delete station kiosk" });
  }
};

/** POST /api/station-kiosks/auth */
export const authenticateStation = async (req: Request, res: Response) => {
  try {
    const { pinCode } = req.body;
    if (!pinCode) {
      res.status(400).json({ error: 'PIN code is required' });
      return;
    }

    // Look up PIN against profiles table (not station_kiosks)
    const profilesWithPin = await query<{ id: string; name: string; pin: string }>(
      `SELECT id, name, pin FROM profiles WHERE pin IS NOT NULL AND is_active = true`
    );

    let matchedProfile: { id: string; name: string } | null = null;
    for (const profile of profilesWithPin) {
      const match = await bcrypt.compare(pinCode, profile.pin);
      if (match) {
        matchedProfile = { id: profile.id, name: profile.name };
        break;
      }
    }

    if (!matchedProfile) {
      res.status(401).json({ error: 'Invalid PIN' });
      return;
    }

    // Return user identity — legacy fields retained for backward compatibility with kiosk UI
    res.json({
      userId: matchedProfile.id,
      userName: matchedProfile.name,
      kioskId: 0,
      stationName: matchedProfile.name,
    });
  } catch (error) {
    console.error('Kiosk auth error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
};