import express from 'express';
import * as engineersController from '../controllers/engineers.controller';

const router = express.Router();

router.get('/', engineersController.getEngineers);
router.post('/', engineersController.createEngineer);
router.put('/:id', engineersController.updateEngineer);
router.delete('/:id', engineersController.deleteEngineer);

export default router;
