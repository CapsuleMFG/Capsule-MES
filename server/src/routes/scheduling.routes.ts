import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getSchedule,
  updatePosition,
  moveEntry,
  updateStatus,
  generateScheduleEntries,
  getBlockedCount,
} from '../controllers/scheduling.controller';

const router = Router();

router.get('/', requireRole('admin', 'manager'), getSchedule);
router.get('/blocked-count', getBlockedCount);
router.put('/:id/position', requireRole('admin', 'manager'), updatePosition);
router.put('/:id/move', requireRole('admin', 'manager'), moveEntry);
router.put('/:id/status', requireRole('admin', 'manager', 'engineer'), updateStatus);
router.post('/generate/:jobId', requireRole('admin', 'manager'), generateScheduleEntries);

export default router;
