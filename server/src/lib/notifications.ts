import { execute } from '../models/database';
import { logger } from './logger';
import type { NotificationType, NotificationCategory } from '../../../shared/types';

interface CreateNotificationParams {
  userId?: string | null;  // null = broadcast to all users
  title: string;
  message: string;
  type: NotificationType;
  category?: NotificationCategory;
  referenceType?: string;
  referenceId?: number;
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  try {
    await execute(
      `INSERT INTO notifications (user_id, title, message, type, category, reference_type, reference_id)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [params.userId ?? null, params.title, params.message, params.type, params.category ?? null, params.referenceType ?? null, params.referenceId ?? null]
    );
  } catch (error) {
    logger.error('Failed to create notification', { error: error instanceof Error ? error.message : error });
  }
}
