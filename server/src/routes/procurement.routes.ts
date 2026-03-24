import express from 'express';
import { requireRole } from '../middleware/roles';
import * as procurementController from '../controllers/procurement.controller';

const router = express.Router({ mergeParams: true });

// Procurement routes (nested under /api/jobs/:jobId)
router.get('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), procurementController.getProcurementItems);
router.post('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), procurementController.createProcurementItem);
router.put('/:procId', requireRole('admin', 'manager', 'engineer', 'supply_chain'), procurementController.updateProcurementItem);
router.delete('/:procId', requireRole('admin', 'manager', 'supply_chain'), procurementController.deleteProcurementItem);

export default router;
