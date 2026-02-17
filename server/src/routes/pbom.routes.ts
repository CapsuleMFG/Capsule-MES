import express from 'express';
import * as pbomController from '../controllers/pbom.controller';
import { uploadBomFile } from '../middleware/upload';

const router = express.Router({ mergeParams: true });

// PBOM routes (nested under /api/jobs/:jobId/pbom)
router.get('/', pbomController.getPbomItems);
router.post('/', pbomController.createPbomItem);
router.put('/:pbomId', pbomController.updatePbomItem);
router.delete('/', pbomController.deleteAllPbomItems);
router.delete('/:pbomId', pbomController.deletePbomItem);
router.post('/send-to-sc', pbomController.sendToSupplyChain);
router.post('/auto-match', pbomController.autoMatchPbomToInventory);
router.post('/reallocate', pbomController.reallocateAllPbomItems);
router.post('/import', uploadBomFile, pbomController.importPbom);

export default router;
