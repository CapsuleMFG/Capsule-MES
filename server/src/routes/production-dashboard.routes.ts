import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import {
  getProductionDashboard,
  updateMachineStatus,
} from '../controllers/production-dashboard.controller';

const router = Router();

router.get('/', getProductionDashboard);
router.put('/machines/:id/status', requireRole('admin', 'manager'), updateMachineStatus);

export default router;
