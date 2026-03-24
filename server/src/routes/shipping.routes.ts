import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import * as shippingController from '../controllers/shipping.controller';

const router = Router();

router.get('/', shippingController.getShipments);
router.get('/:id', shippingController.getShipment);
router.get('/job/:jobId', shippingController.getShipmentByJob);
router.post('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), shippingController.createShipment);
router.put('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), shippingController.updateShipment);
router.delete('/:id', requireRole('admin', 'manager'), shippingController.deleteShipment);

export default router;
