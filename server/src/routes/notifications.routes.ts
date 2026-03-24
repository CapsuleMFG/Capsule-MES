import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import * as notificationsController from '../controllers/notifications.controller';

const router = Router();

// All authenticated users can manage their own notifications
router.get('/', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), notificationsController.getNotifications);
router.get('/unread-count', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), notificationsController.getUnreadCount);
router.put('/read-all', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), notificationsController.markAllAsRead);
router.put('/:id/read', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), notificationsController.markAsRead);
router.delete('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), notificationsController.deleteNotification);

export default router;
