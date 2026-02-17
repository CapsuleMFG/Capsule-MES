import express from 'express';
import * as clientsController from '../controllers/clients.controller';

const router = express.Router();

// Client CRUD routes
router.get('/', clientsController.getClients);
router.post('/', clientsController.createClient);
router.get('/:id', clientsController.getClientById);
router.put('/:id', clientsController.updateClient);
router.delete('/:id', clientsController.deleteClient);

export default router;
