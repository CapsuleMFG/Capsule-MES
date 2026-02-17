import { Router } from 'express';
import * as controller from '../controllers/tracked-parts.controller.js';

const router = Router();

// Tracked parts list and lookup
router.get('/', controller.getTrackedParts);
router.get('/lookup/:trackingId', controller.lookupByTrackingId);
router.get('/station/:stationName', controller.getStationQueue);
router.get('/:id', controller.getTrackedPart);
router.put('/:id', controller.updateTrackedPart);
router.delete('/:id', controller.deleteTrackedPart);

// Check-in/Check-out
router.post('/:id/check-in', controller.checkIn);
router.post('/:id/check-out', controller.checkOut);


export default router;
