import { Router } from 'express';
import {
  listResourcesController,
  getResourceController,
  createResourceController,
  updateResourceController,
  getAvailabilityController,
  createReservationController,
  listReservationsController,
  getReservationController,
  updateReservationController,
  reviewReservationController,
} from './bookings.controller';
import { authenticate, requirePermission } from '../auth/middleware';

const bookingsRouter = Router();

// ─── Resources ────────────────────────────────────────────────────────────────
bookingsRouter.get('/resources', authenticate, listResourcesController);
bookingsRouter.get('/resources/:id', authenticate, getResourceController);
bookingsRouter.post('/resources', authenticate, requirePermission('bookings:write'), createResourceController);
bookingsRouter.patch('/resources/:id', authenticate, requirePermission('bookings:write'), updateResourceController);
bookingsRouter.get('/resources/:id/availability', authenticate, getAvailabilityController);

// ─── Reservations ─────────────────────────────────────────────────────────────
bookingsRouter.get('/reservations', authenticate, listReservationsController);
bookingsRouter.post('/reservations', authenticate, createReservationController);
bookingsRouter.get('/reservations/:id', authenticate, getReservationController);
bookingsRouter.patch('/reservations/:id', authenticate, updateReservationController);
bookingsRouter.post('/reservations/:id/review', authenticate, requirePermission('bookings:approve'), reviewReservationController);

export default bookingsRouter;