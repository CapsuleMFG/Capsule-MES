import { Request, Response, NextFunction } from 'express';
import type { AuthenticatedUser } from './auth';

type UserRole = AuthenticatedUser['role'];

/**
 * Middleware that restricts access to specific roles.
 * Must be applied AFTER authMiddleware.
 *
 * Usage: router.get('/admin', requireRole('admin'), handler)
 * Usage: router.get('/manage', requireRole('admin', 'manager'), handler)
 */
export const requireRole = (...allowedRoles: UserRole[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    next();
  };
};
