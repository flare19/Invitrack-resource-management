// src/modules/audit/controller.ts

import { Request, Response, NextFunction } from 'express';
import { listAuditEventsService, getAuditEventService } from './audit.service';

export async function listAuditEventsController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await listAuditEventsService({
        ...(req.query['actor_id'] && { actorId: req.query['actor_id'] as string }),
        ...(req.query['module'] && { module: req.query['module'] as string }),
        ...(req.query['action'] && { action: req.query['action'] as string }),
        ...(req.query['target_type'] && { targetType: req.query['target_type'] as string }),
        ...(req.query['target_id'] && { targetId: req.query['target_id'] as string }),
        ...(req.query['from'] && { from: req.query['from'] as string }),
        ...(req.query['to'] && { to: req.query['to'] as string }),
        ...(req.query['page'] && { page: parseInt(req.query['page'] as string, 10) }),
        ...(req.query['per_page'] && { perPage: parseInt(req.query['per_page'] as string, 10) }),
    });

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getAuditEventController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const event = await getAuditEventService(id);
    res.status(200).json(event);
  } catch (err) {
    next(err);
  }
}