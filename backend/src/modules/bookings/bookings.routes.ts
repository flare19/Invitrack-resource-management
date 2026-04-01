import { Router } from 'express';
import {
  listResourcesController,
  getResourceController,
  createResourceController,
  updateResourceController,
  getAvailabilityController,
  createReservationController,
} from './bookings.controller';
import { authenticate, requireRole } from '../auth/middleware';

const bookingsRouter = Router();

// ─── Resources ────────────────────────────────────────────────────────────────
bookingsRouter.get('/resources', authenticate, listResourcesController);
bookingsRouter.post('/resources', authenticate, requireRole('admin', 'manager'), createResourceController);
bookingsRouter.patch('/resources/:id', authenticate, requireRole('admin', 'manager'), updateResourceController);
bookingsRouter.get('/resources/:id/availability', authenticate, getAvailabilityController);
bookingsRouter.post('/reservations', authenticate, createReservationController);

export default bookingsRouter;