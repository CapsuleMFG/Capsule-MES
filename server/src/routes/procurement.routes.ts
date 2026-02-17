import express from 'express';
import * as procurementController from '../controllers/procurement.controller';

const router = express.Router({ mergeParams: true });

// Procurement routes (nested under /api/jobs/:jobId)
router.get('/', procurementController.getProcurementItems);
router.post('/', procurementController.createProcurementItem);
router.put('/:procId', procurementController.updateProcurementItem);
router.delete('/:procId', procurementController.deleteProcurementItem);

export default router;
