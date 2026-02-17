import express from 'express';
import * as inventoryController from '../controllers/inventory.controller';

const router = express.Router();

// Global Inventory CRUD routes
router.get('/', inventoryController.getInventoryItems);
router.get('/available', inventoryController.getAvailableInventory);
router.post('/', inventoryController.createInventoryItem);
router.get('/:id/demand-details', inventoryController.getDemandDetails);
router.post('/:id/mass-order', inventoryController.massOrder);
router.get('/:id', inventoryController.getInventoryItem);
router.put('/:id', inventoryController.updateInventoryItem);
router.delete('/:id', inventoryController.deleteInventoryItem);

export default router;
