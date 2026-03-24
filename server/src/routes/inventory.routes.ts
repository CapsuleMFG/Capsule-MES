import express from 'express';
import { body, param } from 'express-validator';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import * as inventoryController from '../controllers/inventory.controller';

const router = express.Router();

// Validation chains
const createInventoryValidation = [
  body('description').isString().notEmpty().trim(),
  body('quantityOnHand').optional().isFloat({ min: 0 }),
  body('partNumber').optional({ values: 'falsy' }).isString().trim(),
];

const updateInventoryValidation = [
  param('id').isInt({ min: 1 }),
  body('description').optional().isString().trim(),
  body('quantityOnHand').optional().isFloat({ min: 0 }),
  body('partNumber').optional({ values: 'falsy' }).isString().trim(),
];

// Global Inventory CRUD routes
router.get('/', inventoryController.getInventoryItems);
router.get('/available', inventoryController.getAvailableInventory);
router.post('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), createInventoryValidation, validate, inventoryController.createInventoryItem);
router.get('/:id/demand-details', inventoryController.getDemandDetails);
router.post('/:id/mass-order', requireRole('admin', 'manager', 'engineer', 'supply_chain'), inventoryController.massOrder);
router.get('/:id', inventoryController.getInventoryItem);
router.put('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), updateInventoryValidation, validate, inventoryController.updateInventoryItem);
router.delete('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), inventoryController.deleteInventoryItem);

export default router;
