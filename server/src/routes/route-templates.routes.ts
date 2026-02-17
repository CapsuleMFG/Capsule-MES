import { Router } from 'express';
import * as controller from '../controllers/route-templates.controller.js';

const router = Router();

router.get('/', controller.getRouteTemplates);
router.get('/:id', controller.getRouteTemplate);
router.post('/', controller.createRouteTemplate);
router.put('/:id', controller.updateRouteTemplate);
router.delete('/:id', controller.deleteRouteTemplate);

// Steps
router.post('/:id/steps', controller.addStep);
router.put('/:id/steps/reorder', controller.reorderSteps);
router.put('/:id/steps/:stepId', controller.updateStep);
router.delete('/:id/steps/:stepId', controller.deleteStep);

export default router;
