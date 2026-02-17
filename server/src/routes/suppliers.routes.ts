import express from 'express';
import * as suppliersController from '../controllers/suppliers.controller';

const router = express.Router();

// Supplier CRUD routes
router.get('/', suppliersController.getSuppliers);
router.post('/', suppliersController.createSupplier);
router.get('/:id', suppliersController.getSupplier);
router.put('/:id', suppliersController.updateSupplier);
router.delete('/:id', suppliersController.deleteSupplier);

export default router;
