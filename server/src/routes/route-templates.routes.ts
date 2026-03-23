import { Router } from 'express';
import * as controller from '../controllers/route-templates.controller.js';
import { requireRole } from '../middleware/roles';

const router = Router();

router.get('/', controller.getRouteTemplates);
router.get('/:id', controller.getRouteTemplate);
router.post('/', requireRole('admin', 'manager', 'engineer'), controller.createRouteTemplate);
router.put('/:id', requireRole('admin', 'manager', 'engineer'), controller.updateRouteTemplate);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), controller.deleteRouteTemplate);

// Steps
router.post('/:id/steps', requireRole('admin', 'manager', 'engineer'), controller.addStep);
router.put('/:id/steps/reorder', requireRole('admin', 'manager', 'engineer'), controller.reorderSteps);
router.put('/:id/steps/:stepId', requireRole('admin', 'manager', 'engineer'), controller.updateStep);
router.delete('/:id/steps/:stepId', requireRole('admin', 'manager', 'engineer'), controller.deleteStep);

export default router;
