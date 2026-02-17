import express from 'express';
import * as workOrdersController from '../controllers/workOrders.controller';

const router = express.Router({ mergeParams: true });

// Work Orders routes (nested under /api/jobs/:jobId)
router.get('/', workOrdersController.getWorkOrders);
router.post('/', workOrdersController.createWorkOrder);
router.get('/:woId', workOrdersController.getWorkOrder);
router.put('/:woId', workOrdersController.updateWorkOrder);
router.delete('/:woId', workOrdersController.deleteWorkOrder);

export default router;
