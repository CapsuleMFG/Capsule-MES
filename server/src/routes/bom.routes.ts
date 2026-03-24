import express from 'express';
import * as bomController from '../controllers/bom.controller';
import { uploadBomFile } from '../middleware/upload';
import { requireRole } from '../middleware/roles';

const router = express.Router({ mergeParams: true });

// BOM routes (nested under /api/jobs/:jobId/bom)
router.get('/', bomController.getBomItems);
router.get('/export', bomController.exportBomToCsv);
router.post('/', requireRole('admin', 'manager', 'engineer'), bomController.createBomItem);
router.put('/:bomId', requireRole('admin', 'manager', 'engineer'), bomController.updateBomItem);
router.delete('/', requireRole('admin', 'manager'), bomController.deleteAllBomItems);
router.delete('/:bomId', requireRole('admin', 'manager', 'engineer'), bomController.deleteBomItem);
router.post('/import', requireRole('admin', 'manager', 'engineer'), uploadBomFile, bomController.importBom);

export default router;
