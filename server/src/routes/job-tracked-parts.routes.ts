import { Router } from 'express';
import * as controller from '../controllers/tracked-parts.controller.js';

const router = Router({ mergeParams: true });

router.post('/', controller.createTrackedPart);
router.post('/bulk', controller.bulkCreateTrackedParts);
router.get('/summary', controller.getTrackedPartsSummary);

export default router;
