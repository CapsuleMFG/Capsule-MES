import express from 'express';
import * as pbomController from '../controllers/pbom.controller';

const router = express.Router();

// GET /api/pbom/orders - Get all ordered PBOM items across all jobs
router.get('/', pbomController.getAllOrderedPbomItems);

export default router;
