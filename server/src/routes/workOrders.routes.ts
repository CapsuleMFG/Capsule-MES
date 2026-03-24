import express from 'express';
import * as workOrdersController from '../controllers/workOrders.controller';
import { requireRole } from '../middleware/roles';

const router = express.Router({ mergeParams: true });

// Work Orders routes (nested under /api/jobs/:jobId)
router.get('/', workOrdersController.getWorkOrders);
router.post('/', requireRole('admin', 'manager', 'engineer'), workOrdersController.createWorkOrder);
router.get('/:woId', workOrdersController.getWorkOrder);
router.put('/:woId', requireRole('admin', 'manager', 'engineer'), workOrdersController.updateWorkOrder);
router.delete('/:woId', requireRole('admin', 'manager'), workOrdersController.deleteWorkOrder);

export default router;
