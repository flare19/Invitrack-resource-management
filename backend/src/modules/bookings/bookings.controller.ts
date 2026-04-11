import { Request, Response, NextFunction } from 'express';
import { AppError } from '../../errors/AppError';
import {
  listResourcesService,
  getResourceService,
  createResourceService,
  updateResourceService,
  getAvailabilityService,
  createReservationService,
  listReservationsService,
  getReservationService,
  updateReservationService,
  reviewReservationService,
} from './bookings.service';

import { 
  CreateReservationDTO,
  UpdateReservationDTO,
  ReviewReservationDTO,
 } from './bookings.types';

// ============================================================
// Resources
// ============================================================

export async function listResourcesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = parseInt(req.query['page'] as string) || 1;
    const perPage = Math.min(parseInt(req.query['per_page'] as string) || 20, 100);

    const result = await listResourcesService(page, perPage);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const resource = await getResourceService(id);
    res.status(200).json(resource);
  } catch (err) {
    next(err);
  }
}

export async function createResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { item_id, name, quantity } = req.body;

    if (!item_id || typeof item_id !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'item_id is required and must be a string.',
          details: {},
        },
      });
      return;
    }

    if (!name || typeof name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name is required and must be a string.',
          details: {},
        },
      });
      return;
    }

    if (quantity === undefined || typeof quantity !== 'number' || quantity <= 0) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantity is required and must be a positive number.',
          details: {},
        },
      });
      return;
    }

    const resource = await createResourceService({ item_id, name, quantity });
    res.status(201).json(resource);
  } catch (err) {
    next(err);
  }
}

export async function updateResourceController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { name, quantity, is_active } = req.body;

    if (name !== undefined && typeof name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'name must be a string.',
          details: {},
        },
      });
      return;
    }

    if (quantity !== undefined && (typeof quantity !== 'number' || quantity <= 0)) {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'quantity must be a positive number.',
          details: {},
        },
      });
      return;
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'is_active must be a boolean.',
          details: {},
        },
      });
      return;
    }

    const resource = await updateResourceService(id, { name, quantity, is_active });
    res.status(200).json(resource);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Availability
// ============================================================

export async function getAvailabilityController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { start_time, end_time } = req.query as {
      start_time?: string;
      end_time?: string;
    };

    if (!start_time || !end_time) {
      throw new AppError(400, 'MISSING_PARAMS', 'start_time and end_time are required.');
    }

    const startTime = new Date(start_time);
    const endTime = new Date(end_time);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      throw new AppError(
        400,
        'INVALID_DATE',
        'start_time and end_time must be valid ISO 8601 dates.'
      );
    }

    if (endTime <= startTime) {
      throw new AppError(400, 'INVALID_TIME_RANGE', 'end_time must be after start_time.');
    }

    const result = await getAvailabilityService(id, startTime, endTime);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Reservations
// ============================================================

export async function createReservationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accountId = req.user!.id;
    const permissions = req.user!.permissions;
    const body = req.body as CreateReservationDTO;

    if (!body.resource_id || !body.quantity || !body.start_time || !body.end_time) {
      throw new AppError(
        400,
        'MISSING_FIELDS',
        'resource_id, quantity, start_time, and end_time are required.'
      );
    }

    if (typeof body.quantity !== 'number' || body.quantity < 1) {
      throw new AppError(422, 'INVALID_QUANTITY', 'quantity must be a positive integer.');
      }

    if (body.override !== undefined && typeof body.override !== 'boolean') {
      throw new AppError(422, 'INVALID_OVERRIDE', 'override must be a boolean.');
    }

    const reservation = await createReservationService(body, accountId, permissions);
    res.status(201).json(reservation);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Reservation Reads
// ============================================================

export async function listReservationsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accountId = req.user!.id;
    const permissions = req.user!.permissions;

    const page = parseInt(req.query['page'] as string) || 1;
    const perPage = Math.min(parseInt(req.query['per_page'] as string) || 20, 100);

    const result = await listReservationsService(accountId, permissions, {
      ...(req.query['resource_id'] && { resourceId: req.query['resource_id'] as string }),
      ...(req.query['status'] && { status: req.query['status'] as string }),
      ...(req.query['requested_by'] && { requestedBy: req.query['requested_by'] as string }),
      ...(req.query['from'] && { from: req.query['from'] as string }),
      ...(req.query['to'] && { to: req.query['to'] as string }),
      page,
      perPage,
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getReservationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const accountId = req.user!.id;
    const permissions = req.user!.permissions;

    const reservation = await getReservationService(id, accountId, permissions);
    res.status(200).json(reservation);
  } catch (err) {
    next(err);
  }
}

// ============================================================
// Reservation Mutations
// ============================================================

export async function updateReservationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const accountId = req.user!.id;
    const permissions = req.user!.permissions;
    const body = req.body as UpdateReservationDTO;

    if (body.quantity !== undefined && (typeof body.quantity !== 'number' || body.quantity < 1)) {
      throw new AppError(422, 'INVALID_QUANTITY', 'quantity must be a positive integer.');
    }

    const reservation = await updateReservationService(id, body, accountId, permissions);
    res.status(200).json(reservation);
  } catch (err) {
    next(err);
  }
}

export async function reviewReservationController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const reviewerId = req.user!.id;
    const body = req.body as ReviewReservationDTO;

    if (!body.action || !['approve', 'reject'].includes(body.action)) {
      throw new AppError(400, 'INVALID_ACTION', 'action must be "approve" or "reject".');
    }

    const reservation = await reviewReservationService(id, body, reviewerId);
    res.status(200).json(reservation);
  } catch (err) {
    next(err);
  }
}