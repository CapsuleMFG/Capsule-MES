import express from 'express';
import { requireRole } from '../middleware/roles';
import * as engineersController from '../controllers/engineers.controller';

const router = express.Router();

router.get('/', requireRole('admin', 'manager', 'engineer'), engineersController.getEngineers);
router.post('/', requireRole('admin', 'manager'), engineersController.createEngineer);
router.put('/:id', requireRole('admin', 'manager'), engineersController.updateEngineer);
router.delete('/:id', requireRole('admin', 'manager'), engineersController.deleteEngineer);

export default router;
