import { Router } from 'express';
import {
  listResourcesController,
  getResourceController,
  createResourceController,
  updateResourceController,
} from './bookings.controller';
import { authenticate, requireRole } from '../auth/middleware';

const bookingsRouter = Router();

// ─── Resources ────────────────────────────────────────────────────────────────
bookingsRouter.get('/resources', authenticate, listResourcesController);
bookingsRouter.post('/resources', authenticate, requireRole('admin', 'manager'), createResourceController);
bookingsRouter.patch('/resources/:id', authenticate, requireRole('admin', 'manager'), updateResourceController);

export default bookingsRouter;