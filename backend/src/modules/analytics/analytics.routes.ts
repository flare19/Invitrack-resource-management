// src/modules/analytics/analytics.routes.ts

import { Router } from 'express';
import { authenticate, requireRole } from '../auth/middleware';
import { getInventorySnapshotsController, getBookingMetricsController } from './analytics.controller';

const router = Router();

router.get(
  '/inventory/snapshots',
  authenticate,
  requireRole('admin', 'manager'),
  getInventorySnapshotsController
);

router.get(
  '/bookings/metrics',
  authenticate,
  requireRole('admin', 'manager'),
  getBookingMetricsController
);

export default router;