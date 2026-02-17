import express from 'express';
import * as workflowController from '../controllers/workflow.controller';

const router = express.Router();

// Workflow stages endpoint
router.get('/stages', workflowController.getWorkflowStages);

export default router;
