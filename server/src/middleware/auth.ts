import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../lib/supabase';
import { queryOne } from '../models/database';
import { logger } from '../lib/logger';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'supply_chain' | 'operator';
  stationName?: string;
  authType?: 'station' | 'operator';
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

interface KioskJwtPayload {
  type: 'kiosk';
  kioskId: number;
  stationName: string | null;
  userId?: string;
  userName?: string;
  authType: 'station' | 'operator';
  role: string;
}

const DEV_USER: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@capsule.local',
  name: 'Dev User',
  role: 'admin',
};

const KIOSK_JWT_SECRET = process.env.KIOSK_JWT_SECRET || '';

// Log dev bypass warning once at startup
const isProduction = process.env.NODE_ENV === 'production';
const authRequired = process.env.AUTH_REQUIRED?.toLowerCase() === 'true';
if (!isProduction && !authRequired) {
  logger.warn('AUTH DISABLED — dev bypass active. Set AUTH_REQUIRED=true for production.');
}

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Public endpoints that don't require auth
  const publicPaths = ['/api/station-kiosks/auth', '/api/auth/logout', '/health'];
  if (publicPaths.some(p => req.path === p)) {
    return next();
  }

  // Dev bypass — never active in production (startup guard prevents it)
  if (!isProduction && !authRequired) {
    res.setHeader('X-Auth-Mode', 'dev-bypass');
    req.user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

  // Step 1: Peek at the token to check if it's a kiosk JWT
  const decoded = jwt.decode(token) as Record<string, unknown> | null;

  if (decoded && decoded.type === 'kiosk') {
    // This is a kiosk token — verify it with KIOSK_JWT_SECRET
    if (!KIOSK_JWT_SECRET) {
      logger.error('KIOSK_JWT_SECRET is not configured');
      res.status(500).json({ error: 'Kiosk authentication not configured' });
      return;
    }

    try {
      const payload = jwt.verify(token, KIOSK_JWT_SECRET) as KioskJwtPayload;
      req.user = {
        id: payload.userId || `kiosk-${payload.kioskId}`,
        email: '',
        name: payload.userName || payload.stationName || '',
        role: (payload.role as AuthenticatedUser['role']) || 'operator',
        stationName: payload.authType === 'station' ? (payload.stationName ?? undefined) : undefined,
        authType: payload.authType,
      };
      return next();
    } catch (err) {
      // Kiosk token is expired or tampered — do NOT fall through to Supabase
      if (err instanceof jwt.TokenExpiredError) {
        res.status(401).json({ error: 'Kiosk session expired' });
      } else {
        res.status(401).json({ error: 'Invalid kiosk token' });
      }
      return;
    }
  }

  // Step 2: Not a kiosk token — validate with Supabase
  try {
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Fetch profile for role and name
    const profile = await queryOne<{ name: string; role: string; is_active: boolean }>(
      'SELECT name, role, is_active FROM profiles WHERE id = $1',
      [user.id]
    );

    if (!profile) {
      res.status(401).json({ error: 'User profile not found' });
      return;
    }

    if (!profile.is_active) {
      res.status(403).json({ error: 'Account is disabled' });
      return;
    }

    // Validate role at runtime
    const validRoles: AuthenticatedUser['role'][] = ['admin', 'manager', 'engineer', 'supply_chain', 'operator'];
    if (!validRoles.includes(profile.role as AuthenticatedUser['role'])) {
      logger.warn('Unknown role in profile', { userId: user.id, role: profile.role });
      res.status(403).json({ error: 'Invalid user role' });
      return;
    }

    req.user = {
      id: user.id,
      email: user.email || '',
      name: profile.name,
      role: profile.role as AuthenticatedUser['role'],
    };

    next();
  } catch (error) {
    logger.error('Auth middleware error', { error: error instanceof Error ? error.message : error });
    res.status(401).json({ error: 'Authentication failed' });
  }
};
