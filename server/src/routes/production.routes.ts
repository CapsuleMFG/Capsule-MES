import { Router } from 'express';
import * as productionController from '../controllers/production.controller';
import { requireRole } from '../middleware/roles';

const router = Router();

// Get production pool (all WOs in production workflow)
router.get('/pool', productionController.getProductionPool);

// Get all active machines
router.get('/machines', productionController.getMachines);

// Send work order to production pool
router.post('/jobs/:jobId/work-orders/:woId/send', requireRole('admin', 'manager', 'engineer'), productionController.sendToProduction);

// Assign work order to a specific machine
router.post('/work-orders/:woId/assign', requireRole('admin', 'manager', 'engineer'), productionController.assignToMachine);

// Update production status
router.put('/work-orders/:woId/status', requireRole('admin', 'manager', 'engineer'), productionController.updateProductionStatus);

// Update production priority
router.put('/work-orders/:woId/priority', requireRole('admin', 'manager'), productionController.updateProductionPriority);

export default router;
