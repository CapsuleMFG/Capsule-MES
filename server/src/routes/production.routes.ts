import { Router } from 'express';
import * as productionController from '../controllers/production.controller';

const router = Router();

// Get production pool (all WOs in production workflow)
router.get('/pool', productionController.getProductionPool);

// Get all active machines
router.get('/machines', productionController.getMachines);

// Send work order to production pool
router.post('/jobs/:jobId/work-orders/:woId/send', productionController.sendToProduction);

// Assign work order to a specific machine
router.post('/work-orders/:woId/assign', productionController.assignToMachine);

// Update production status
router.put('/work-orders/:woId/status', productionController.updateProductionStatus);

// Update production priority
router.put('/work-orders/:woId/priority', productionController.updateProductionPriority);

export default router;
