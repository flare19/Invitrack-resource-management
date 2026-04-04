// src/modules/analytics/analytics.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getInventorySnapshotsService, getBookingMetricsService } from './analytics.service';
import { InventorySnapshotsQueryDTO, BookingMetricsQueryDTO } from './analytics.types';

export async function getInventorySnapshotsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query: InventorySnapshotsQueryDTO = {
      item_id: req.query['item_id'] as string,
      ...(req.query['location_id'] && { location_id: req.query['location_id'] as string }),
      ...(req.query['from'] && { from: req.query['from'] as string }),
      ...(req.query['to'] && { to: req.query['to'] as string }),
    };

    const result = await getInventorySnapshotsService(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getBookingMetricsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const query: BookingMetricsQueryDTO = {
      ...(req.query['resource_id'] && { resource_id: req.query['resource_id'] as string }),
      ...(req.query['from'] && { from: req.query['from'] as string }),
      ...(req.query['to'] && { to: req.query['to'] as string }),
    };

    const result = await getBookingMetricsService(query);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}