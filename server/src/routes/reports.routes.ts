import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import { getKpiReport } from '../controllers/reports.controller';

const router = Router();

router.get('/kpis', requireRole('admin', 'manager'), getKpiReport);

export default router;
