// src/modules/audit/routes.ts

import { Router } from 'express';
import { authenticate , requireRole } from '../auth/middleware';
import { listAuditEventsController, getAuditEventController } from './audit.controller';

const router = Router();

router.get(
  '/events',
  authenticate,
  requireRole('admin'),
  listAuditEventsController
);

router.get(
  '/events/:id',
  authenticate,
  requireRole('admin'),
  getAuditEventController
);

export default router;