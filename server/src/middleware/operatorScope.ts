import { Request, Response, NextFunction } from 'express';
import { queryOne } from '../models/database';
import { logger } from '../lib/logger';

/**
 * Operator scope middleware — restricts operator-role users to a whitelist
 * of station-scoped paths. Non-operator roles pass through unchanged.
 *
 * Must be mounted AFTER authMiddleware (requires req.user).
 */
export const operatorScope = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Only applies to operator role
  if (!req.user || req.user.role !== 'operator') {
    return next();
  }

  const method = req.method;
  const path = req.path;
  const stationName = req.user.stationName; // Only set for station-PIN tokens

  // --- Whitelist: reference data (no station check needed) ---
  if (method === 'GET' && (
    path === '/api/workflow/stages' ||
    path === '/api/machines' ||
    path.startsWith('/api/machines/')
  )) {
    return next();
  }

  // --- Whitelist: notifications (ownership enforced in controller) ---
  if (path.startsWith('/api/notifications')) {
    return next();
  }

  // --- Whitelist: tracked parts by station ---
  if (method === 'GET' && path.startsWith('/api/tracked-parts/station/')) {
    // Verify the station name matches the operator's station
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const requestedStation = decodeURIComponent(path.split('/api/tracked-parts/station/')[1]);
    if (requestedStation.trim().toLowerCase() !== stationName.trim().toLowerCase()) {
      res.status(403).json({ error: 'Cannot access another station\'s queue' });
      return;
    }
    return next();
  }

  // --- Whitelist: tracked part lookup by tracking ID ---
  if (method === 'GET' && path.startsWith('/api/tracked-parts/lookup/')) {
    return next();
  }

  // --- Whitelist: tracked part by ID (GET, check-in, check-out) — requires station DB check ---
  const trackedPartMatch = path.match(/^\/api\/tracked-parts\/(\d+)(\/check-in|\/check-out)?$/);
  if (trackedPartMatch && (method === 'GET' || method === 'POST')) {
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const partId = trackedPartMatch[1];
    try {
      const part = await queryOne<{ current_station: string | null }>(
        'SELECT current_station FROM tracked_parts WHERE id = $1',
        [partId]
      );
      if (!part) {
        res.status(404).json({ error: 'Tracked part not found' });
        return;
      }
      if (!part.current_station || part.current_station.trim().toLowerCase() !== stationName.trim().toLowerCase()) {
        res.status(403).json({ error: 'This part is not at your station' });
        return;
      }
      return next();
    } catch (error) {
      logger.error('Operator scope DB check failed', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Authorization check failed' });
      return;
    }
  }

  // --- Whitelist: job detail — only if job has parts at operator's station ---
  const jobMatch = path.match(/^\/api\/jobs\/(\d+)$/);
  if (jobMatch && method === 'GET') {
    if (!stationName) {
      res.status(403).json({ error: 'No station context — authenticate via station PIN first' });
      return;
    }
    const jobId = jobMatch[1];
    try {
      const part = await queryOne<{ id: number }>(
        `SELECT id FROM tracked_parts
         WHERE job_id = $1 AND LOWER(TRIM(current_station)) = LOWER(TRIM($2))
         LIMIT 1`,
        [jobId, stationName]
      );
      if (!part) {
        res.status(403).json({ error: 'No parts from this job are at your station' });
        return;
      }
      return next();
    } catch (error) {
      logger.error('Operator scope job check failed', { error: error instanceof Error ? error.message : error });
      res.status(500).json({ error: 'Authorization check failed' });
      return;
    }
  }

  // --- Everything else: blocked ---
  res.status(403).json({ error: 'Insufficient permissions for this resource' });
};
