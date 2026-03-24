import express from 'express';
import { requireRole } from '../middleware/roles';
import * as workflowController from '../controllers/workflow.controller';

const router = express.Router();

// Workflow stages endpoint — all authenticated users need this for UI
router.get('/stages', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), workflowController.getWorkflowStages);

export default router;
