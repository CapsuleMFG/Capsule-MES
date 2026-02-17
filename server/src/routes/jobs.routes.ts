import express from 'express';
import * as jobsController from '../controllers/jobs.controller';
import workOrdersRouter from './workOrders.routes';
import bomRouter from './bom.routes';
import pbomRouter from './pbom.routes';
import procurementRouter from './procurement.routes';
import engineeringRouter from './engineering.routes';
import jobTrackedPartsRouter from './job-tracked-parts.routes';

const router = express.Router();

// Job CRUD routes
router.get('/', jobsController.getJobs);
router.get('/analytics', jobsController.getJobAnalytics);
router.post('/', jobsController.createJob);
router.get('/:id', jobsController.getJobById);
router.put('/:id', jobsController.updateJob);
router.delete('/:id', jobsController.deleteJob);

// Workflow routes
router.get('/:id/workflow', jobsController.getJobWorkflow);
router.put('/:id/workflow/:stageId', jobsController.updateWorkflowStage);

// Materials routes
router.get('/:id/materials', jobsController.getJobMaterials);
router.post('/:id/materials', jobsController.createMaterial);
router.put('/:id/materials/:materialId', jobsController.updateMaterial);
router.delete('/:id/materials/:materialId', jobsController.deleteMaterial);

// Labor routes
router.get('/:id/labor', jobsController.getJobLabor);
router.post('/:id/labor', jobsController.createLabor);
router.delete('/:id/labor/:laborId', jobsController.deleteLabor);

// Engineering & Supply Chain routes
router.use('/:jobId/engineering', engineeringRouter);
router.use('/:jobId/procurement', procurementRouter);
router.use('/:jobId/work-orders', workOrdersRouter);
router.use('/:jobId/bom', bomRouter);
router.use('/:jobId/pbom', pbomRouter);
router.use('/:jobId/tracked-parts', jobTrackedPartsRouter);

export default router;
