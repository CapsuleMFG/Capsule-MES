import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import * as designMilestonesController from '../controllers/design-milestones.controller';
import * as bomController from '../controllers/bom.controller';
import * as woFilesController from '../controllers/wo-files.controller';
import * as woPdfParserController from '../controllers/wo-pdf-parser.controller';
import { uploadWoFile, uploadBomFile } from '../middleware/upload';

const router = Router();

// Design Milestones Routes
router.get('/jobs/:jobId/design-milestones', designMilestonesController.getDesignMilestones);
router.post('/jobs/:jobId/design-milestones/single', requireRole('admin', 'manager', 'engineer'), designMilestonesController.createSingleMilestone);
router.post('/jobs/:jobId/design-milestones', requireRole('admin', 'manager', 'engineer'), designMilestonesController.initializeDesignMilestones);
router.put('/jobs/:jobId/design-milestones/:milestoneId', requireRole('admin', 'manager', 'engineer'), designMilestonesController.updateDesignMilestone);
router.delete('/jobs/:jobId/design-milestones/:milestoneId', requireRole('admin', 'manager', 'engineer'), designMilestonesController.deleteDesignMilestone);

// BOM Import Routes (job-level, not work-order-level)
router.post('/jobs/:jobId/bom/import', requireRole('admin', 'manager', 'engineer'), uploadBomFile, bomController.importBom);

// Work Order PDF Parser
router.post('/jobs/:jobId/work-orders/:woId/parse-pdf', requireRole('admin', 'manager', 'engineer'), woPdfParserController.parsePdf);

// Work Order Files Routes
router.post('/jobs/:jobId/work-orders/:woId/files', requireRole('admin', 'manager', 'engineer'), uploadWoFile, woFilesController.uploadWorkOrderFile);
router.get('/jobs/:jobId/work-orders/:woId/files', woFilesController.getWorkOrderFiles);
router.get('/jobs/:jobId/work-orders/:woId/files/:fileId/download', woFilesController.downloadWorkOrderFile);
router.delete('/jobs/:jobId/work-orders/:woId/files/:fileId', requireRole('admin', 'manager', 'engineer'), woFilesController.deleteWorkOrderFile);

export default router;
