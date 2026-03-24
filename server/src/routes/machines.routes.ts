import { Router } from 'express';
import * as machinesController from '../controllers/machines.controller.js';
import { requireRole } from '../middleware/roles';

const router = Router();

router.get('/', machinesController.getMachines);
router.get('/:id', machinesController.getMachine);
router.post('/', requireRole('admin', 'manager'), machinesController.createMachine);
router.put('/:id', requireRole('admin', 'manager'), machinesController.updateMachine);
router.delete('/:id', requireRole('admin', 'manager'), machinesController.deleteMachine);

export default router;
