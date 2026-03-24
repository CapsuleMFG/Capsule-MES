import express from 'express';
import { body, param } from 'express-validator';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import * as jobsController from '../controllers/jobs.controller';
import workOrdersRouter from './workOrders.routes';
import bomRouter from './bom.routes';
import pbomRouter from './pbom.routes';
import procurementRouter from './procurement.routes';
import engineeringRouter from './engineering.routes';
import jobTrackedPartsRouter from './job-tracked-parts.routes';

const router = express.Router();

// Validation chains
const createJobValidation = [
  body('jobNumber').isString().notEmpty().trim().isLength({ max: 50 }),
  body('clientId').isInt({ min: 1 }),
  body('description').isString().notEmpty().trim().isLength({ max: 500 }),
];

const updateJobValidation = [
  param('id').isInt({ min: 1 }),
  body('jobNumber').optional().isString().trim().isLength({ max: 50 }),
  body('description').optional().isString().trim().isLength({ max: 500 }),
];

// Job CRUD routes
router.get('/', jobsController.getJobs);
router.get('/analytics', jobsController.getJobAnalytics);
router.post('/', requireRole('admin', 'manager', 'engineer'), createJobValidation, validate, jobsController.createJob);
router.get('/:id', jobsController.getJobById);
router.put('/:id', requireRole('admin', 'manager', 'engineer'), updateJobValidation, validate, jobsController.updateJob);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), jobsController.deleteJob);

// Workflow routes
router.get('/:id/workflow', jobsController.getJobWorkflow);
router.put('/:id/workflow/:stageId', requireRole('admin', 'manager', 'engineer'), jobsController.updateWorkflowStage);

// Materials routes
router.get('/:id/materials', jobsController.getJobMaterials);
router.post('/:id/materials', requireRole('admin', 'manager', 'engineer'), jobsController.createMaterial);
router.put('/:id/materials/:materialId', requireRole('admin', 'manager', 'engineer'), jobsController.updateMaterial);
router.delete('/:id/materials/:materialId', requireRole('admin', 'manager', 'engineer'), jobsController.deleteMaterial);

// Labor routes
router.get('/:id/labor', jobsController.getJobLabor);
router.post('/:id/labor', requireRole('admin', 'manager', 'engineer'), jobsController.createLabor);
router.delete('/:id/labor/:laborId', requireRole('admin', 'manager', 'engineer'), jobsController.deleteLabor);

// Engineering & Supply Chain routes
router.use('/:jobId/engineering', engineeringRouter);
router.use('/:jobId/procurement', procurementRouter);
router.use('/:jobId/work-orders', workOrdersRouter);
router.use('/:jobId/bom', bomRouter);
router.use('/:jobId/pbom', pbomRouter);
router.use('/:jobId/tracked-parts', jobTrackedPartsRouter);

export default router;
