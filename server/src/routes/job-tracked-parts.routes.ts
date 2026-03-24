import { Router } from 'express';
import { requireRole } from '../middleware/roles';
import * as controller from '../controllers/tracked-parts.controller.js';

const router = Router({ mergeParams: true });

router.post('/', requireRole('admin', 'manager', 'engineer'), controller.createTrackedPart);
router.post('/bulk', requireRole('admin', 'manager', 'engineer'), controller.bulkCreateTrackedParts);
router.get('/summary', requireRole('admin', 'manager', 'engineer', 'supply_chain', 'operator'), controller.getTrackedPartsSummary);

export default router;
