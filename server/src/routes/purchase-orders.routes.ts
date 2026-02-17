import express from 'express';
import * as purchaseOrdersController from '../controllers/purchase-orders.controller';

const router = express.Router();

router.get('/', purchaseOrdersController.getPurchaseOrders);
router.put('/:id', purchaseOrdersController.updatePurchaseOrder);
router.post('/:id/receive', purchaseOrdersController.receivePurchaseOrder);

export default router;
