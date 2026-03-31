import { Request, Response, NextFunction } from 'express';
import {
  listResourcesService,
  getResourceService,
  createResourceService,
  updateResourceService,
} from './bookings.service';

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