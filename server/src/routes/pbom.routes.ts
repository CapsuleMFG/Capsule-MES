import express from 'express';
import * as pbomController from '../controllers/pbom.controller';
import { uploadBomFile } from '../middleware/upload';
import { requireRole } from '../middleware/roles';

const router = express.Router({ mergeParams: true });

// PBOM routes (nested under /api/jobs/:jobId/pbom)
router.get('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.getPbomItems);
router.post('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.createPbomItem);
router.put('/:pbomId', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.updatePbomItem);
router.delete('/', requireRole('admin', 'manager'), pbomController.deleteAllPbomItems);
router.delete('/:pbomId', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.deletePbomItem);
router.post('/send-to-sc', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.sendToSupplyChain);
router.post('/auto-match', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.autoMatchPbomToInventory);
router.post('/reallocate', requireRole('admin', 'manager', 'engineer', 'supply_chain'), pbomController.reallocateAllPbomItems);
router.post('/import', requireRole('admin', 'manager', 'engineer', 'supply_chain'), uploadBomFile, pbomController.importPbom);

export default router;
