import { Request, Response } from 'express';
import { query, queryOne, execute } from '../models/database';
import { logger } from '../lib/logger';

/**
 * GET /api/notifications
 * Query params: unreadOnly (boolean), limit (number, default 50)
 */
export async function getNotifications(req: Request, res: Response): Promise<void> {
  try {
    const unreadOnly = req.query.unreadOnly === 'true';
    const limit = Math.min(Math.max(parseInt(req.query.limit as string, 10) || 50, 1), 200);
    const userId = req.user?.id ?? null;

    const conditions: string[] = [];
    const params: any[] = [];

    // Filter to notifications for the current user or broadcast (user_id IS NULL)
    if (userId) {
      conditions.push('(user_id = ? OR user_id IS NULL)');
      params.push(userId);
    }

    if (unreadOnly) {
      conditions.push('is_read = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    params.push(limit);

    const rows = await query(
      `SELECT id, user_id, title, message, type, category, reference_type, reference_id, is_read, created_at
       FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT ?`,
      params
    );

    res.json(rows);
  } catch (error) {
    logger.error('Failed to fetch notifications', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
}

/**
 * GET /api/notifications/unread-count
 */
export async function getUnreadCount(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id ?? null;

    const conditions: string[] = ['is_read = false'];
    const params: any[] = [];

    if (userId) {
      conditions.push('(user_id = ? OR user_id IS NULL)');
      params.push(userId);
    }

    const row = await queryOne(
      `SELECT COUNT(*)::int AS count FROM notifications WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({ count: row?.count ?? 0 });
  } catch (error) {
    logger.error('Failed to fetch unread count', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to fetch unread count' });
  }
}

/**
 * PUT /api/notifications/:id/read
 */
export async function markAsRead(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const notification = await queryOne<{ id: number; user_id: string | null }>(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Ownership check — broadcast notifications (user_id IS NULL) can be dismissed by anyone
    if (notification.user_id && notification.user_id !== req.user?.id) {
      res.status(403).json({ error: 'Cannot modify another user\'s notification' });
      return;
    }

    await execute(
      'UPDATE notifications SET is_read = true WHERE id = ? AND is_read = false',
      [id]
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark notification as read', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to mark notification as read' });
  }
}

/**
 * PUT /api/notifications/read-all
 */
export async function markAllAsRead(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.id ?? null;

    const conditions: string[] = ['is_read = false'];
    const params: any[] = [];

    if (userId) {
      conditions.push('(user_id = ? OR user_id IS NULL)');
      params.push(userId);
    }

    await execute(
      `UPDATE notifications SET is_read = true WHERE ${conditions.join(' AND ')}`,
      params
    );

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to mark all notifications as read', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to mark all notifications as read' });
  }
}

/**
 * DELETE /api/notifications/:id
 */
export async function deleteNotification(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const notification = await queryOne<{ id: number; user_id: string | null }>(
      'SELECT id, user_id FROM notifications WHERE id = ?',
      [id]
    );

    if (!notification) {
      res.status(404).json({ error: 'Notification not found' });
      return;
    }

    // Ownership check — broadcast notifications (user_id IS NULL) can be deleted by anyone
    if (notification.user_id && notification.user_id !== req.user?.id) {
      res.status(403).json({ error: 'Cannot modify another user\'s notification' });
      return;
    }

    await execute('DELETE FROM notifications WHERE id = ?', [id]);

    res.json({ success: true });
  } catch (error) {
    logger.error('Failed to delete notification', { error: error instanceof Error ? error.message : error });
    res.status(500).json({ error: 'Failed to delete notification' });
  }
}
