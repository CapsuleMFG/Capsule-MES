import { Router } from 'express';
import * as machinesController from '../controllers/machines.controller.js';

const router = Router();

router.get('/', machinesController.getMachines);
router.get('/:id', machinesController.getMachine);
router.post('/', machinesController.createMachine);
router.put('/:id', machinesController.updateMachine);
router.delete('/:id', machinesController.deleteMachine);

export default router;
