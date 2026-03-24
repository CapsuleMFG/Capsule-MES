import express from 'express';
import { requireRole } from '../middleware/roles';
import * as suppliersController from '../controllers/suppliers.controller';

const router = express.Router();

// Supplier CRUD routes
router.get('/', suppliersController.getSuppliers);
router.post('/', requireRole('admin', 'manager', 'engineer', 'supply_chain'), suppliersController.createSupplier);
router.get('/:id', suppliersController.getSupplier);
router.put('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), suppliersController.updateSupplier);
router.delete('/:id', requireRole('admin', 'manager', 'engineer', 'supply_chain'), suppliersController.deleteSupplier);

export default router;
