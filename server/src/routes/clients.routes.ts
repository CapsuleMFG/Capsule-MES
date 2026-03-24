import express from 'express';
import { body, param } from 'express-validator';
import { requireRole } from '../middleware/roles';
import { validate } from '../middleware/validate';
import * as clientsController from '../controllers/clients.controller';

const router = express.Router();

// Validation chains
const createClientValidation = [
  body('name').isString().notEmpty().trim().isLength({ max: 200 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
];

const updateClientValidation = [
  param('id').isInt({ min: 1 }),
  body('name').optional().isString().trim().isLength({ max: 200 }),
  body('email').optional({ values: 'falsy' }).isEmail().normalizeEmail(),
  body('phone').optional({ values: 'falsy' }).isString().trim().isLength({ max: 50 }),
];

// Client CRUD routes
router.get('/', clientsController.getClients);
router.post('/', requireRole('admin', 'manager', 'engineer'), createClientValidation, validate, clientsController.createClient);
router.get('/:id', clientsController.getClientById);
router.put('/:id', requireRole('admin', 'manager', 'engineer'), updateClientValidation, validate, clientsController.updateClient);
router.delete('/:id', requireRole('admin', 'manager', 'engineer'), clientsController.deleteClient);

export default router;
