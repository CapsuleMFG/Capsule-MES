import express from 'express';
import * as supplyChainController from '../controllers/supplychain.controller';

const router = express.Router();

router.get('/priorities', supplyChainController.getScPriorities);
router.put('/priorities', supplyChainController.updateScPriorities);

export default router;
