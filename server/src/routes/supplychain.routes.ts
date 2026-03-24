import express from 'express';
import { requireRole } from '../middleware/roles';
import * as supplyChainController from '../controllers/supplychain.controller';

const router = express.Router();

router.get('/priorities', requireRole('admin', 'manager', 'engineer', 'supply_chain'), supplyChainController.getScPriorities);
router.put('/priorities', requireRole('admin', 'manager', 'supply_chain'), supplyChainController.updateScPriorities);

export default router;
