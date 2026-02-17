import { Router } from 'express';
import * as controller from '../controllers/station-kiosks.controller.js';

const router = Router();

router.get('/', controller.getStationKiosks);
router.post('/', controller.createStationKiosk);
router.post('/auth', controller.authenticateStation);
router.put('/:id', controller.updateStationKiosk);
router.delete('/:id', controller.deleteStationKiosk);

export default router;
