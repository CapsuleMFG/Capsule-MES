import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import * as downtimeController from '../controllers/downtime.controller';

const router = Router();

router.get('/', downtimeController.getDowntimeEvents);
router.get('/analytics', downtimeController.getDowntimeAnalytics);
router.get('/oee', downtimeController.getOeeMetrics);
router.get('/:id', downtimeController.getDowntimeEvent);
router.post('/', requireRole('admin', 'manager', 'engineer'), downtimeController.createDowntimeEvent);
router.put('/:id/resolve', requireRole('admin', 'manager', 'engineer'), downtimeController.resolveDowntimeEvent);

export default router;
