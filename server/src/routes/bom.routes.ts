import express from 'express';
import * as bomController from '../controllers/bom.controller';
import { uploadBomFile } from '../middleware/upload';

const router = express.Router({ mergeParams: true });

// BOM routes (nested under /api/jobs/:jobId/bom)
router.get('/', bomController.getBomItems);
router.get('/export', bomController.exportBomToCsv);
router.post('/', bomController.createBomItem);
router.put('/:bomId', bomController.updateBomItem);
router.delete('/', bomController.deleteAllBomItems);
router.delete('/:bomId', bomController.deleteBomItem);
router.post('/import', uploadBomFile, bomController.importBom);

export default router;
