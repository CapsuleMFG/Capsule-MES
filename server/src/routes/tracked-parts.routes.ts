import { Router } from 'express';
import * as controller from '../controllers/tracked-parts.controller.js';
import { requireRole } from '../middleware/roles';

const router = Router();

// Tracked parts list and lookup
router.get('/', controller.getTrackedParts);
router.get('/lookup/:trackingId', controller.lookupByTrackingId);
router.get('/station/:stationName', controller.getStationQueue);
router.get('/:id', controller.getTrackedPart);
router.put('/:id', requireRole('admin', 'manager', 'engineer'), controller.updateTrackedPart);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), controller.deleteTrackedPart);

// Check-in/Check-out
router.post('/:id/check-in', controller.checkIn);
router.post('/:id/check-out', controller.checkOut);


export default router;
