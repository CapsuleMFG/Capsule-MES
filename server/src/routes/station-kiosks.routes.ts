import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/station-kiosks.controller.js';
import { requireRole } from '../middleware/roles';

const router = Router();

const pinAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many PIN attempts, please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', controller.getStationKiosks);
router.post('/', requireRole('admin', 'manager'), controller.createStationKiosk);
router.post('/auth', pinAuthLimiter, controller.authenticateStation);
router.put('/:id', requireRole('admin', 'manager'), controller.updateStationKiosk);
router.delete('/:id', requireRole('admin', 'manager'), controller.deleteStationKiosk);

export default router;
