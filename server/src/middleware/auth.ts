import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { queryOne } from '../models/database';

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'manager' | 'engineer' | 'operator';
}

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

const DEV_USER: AuthenticatedUser = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@capsule.local',
  name: 'Dev User',
  role: 'admin',
};

export const authMiddleware = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  // Public endpoints that don't require auth
  const publicPaths = ['/api/station-kiosks/auth', '/health'];
  if (publicPaths.some(p => req.path === p)) {
    return next();
  }

  // When auth is not required, attach a dev user and pass through
  if (process.env.AUTH_REQUIRED !== 'true') {
    req.user = DEV_USER;
    return next();
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' });
    return;
  }

  const token = authHeader.split(' ')[1];

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

    req.user = {
      id: user.id,
      email: user.email || '',
      name: profile.name,
      role: profile.role as AuthenticatedUser['role'],
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};
