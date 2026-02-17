import express from 'express';
import * as dashboardController from '../controllers/dashboard.controller';

const router = express.Router();

// Dashboard metrics endpoint
router.get('/metrics', dashboardController.getDashboardMetrics);

export default router;
