import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/station-kiosks.controller.js';

const router = Router();

const pinAuthLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,
  message: { error: 'Too many PIN attempts, please wait before trying again' },
  standardHeaders: true,
  legacyHeaders: false,
});

router.get('/', controller.getStationKiosks);
router.post('/', controller.createStationKiosk);
router.post('/auth', pinAuthLimiter, controller.authenticateStation);
router.put('/:id', controller.updateStationKiosk);
router.delete('/:id', controller.deleteStationKiosk);

export default router;
