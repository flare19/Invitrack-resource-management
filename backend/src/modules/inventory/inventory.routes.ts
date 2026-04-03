import { Router } from 'express';
import {
  listCategoriesController,
  createCategoryController,
  listLocationsController,
  createLocationController,
  listItemsController,
  getItemController,
  createItemController,
  updateItemController,
  deleteItemController,
  getStockLevelsController,
  createTransactionController,
  listTransactionsController,
} from './inventory.controller';
import { authenticate, requireRole, requirePermission } from '../auth/middleware';

const inventoryRouter = Router();

// ─── Categories ───────────────────────────────────────────────────────────────
inventoryRouter.get('/categories', authenticate, listCategoriesController);
inventoryRouter.post('/categories', authenticate, requirePermission('inventory:write'), createCategoryController);

// ─── Locations ────────────────────────────────────────────────────────────────
inventoryRouter.get('/locations', authenticate, listLocationsController);
inventoryRouter.post('/locations', authenticate, requirePermission('inventory:write'), createLocationController);

// ─── Items ────────────────────────────────────────────────────────────────────
inventoryRouter.get('/items', authenticate, listItemsController);
inventoryRouter.post('/items', authenticate, requirePermission('inventory:write'), createItemController);
inventoryRouter.get('/items/:id', authenticate, getItemController);
inventoryRouter.patch('/items/:id', authenticate, requirePermission('inventory:write'), updateItemController);
inventoryRouter.delete('/items/:id', authenticate, requireRole('admin'), deleteItemController);

// ─── Stock Levels ─────────────────────────────────────────────────────────────
inventoryRouter.get('/items/:id/stock', authenticate, getStockLevelsController);

// ─── Transactions ─────────────────────────────────────────────────────────────
inventoryRouter.post('/transactions', authenticate, requirePermission('inventory:write'), createTransactionController);
inventoryRouter.get('/transactions', authenticate, listTransactionsController);

export default inventoryRouter;