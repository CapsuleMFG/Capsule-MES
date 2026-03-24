import express from 'express';
import { requireRole } from '../middleware/roles';
import * as purchaseOrdersController from '../controllers/purchase-orders.controller';

const router = express.Router();

router.get('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), purchaseOrdersController.getPurchaseOrders);
router.put('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), purchaseOrdersController.updatePurchaseOrder);
router.post('/:id/receive', requireRole('admin', 'manager', 'engineer', 'supply_chain'), purchaseOrdersController.receivePurchaseOrder);

export default router;
