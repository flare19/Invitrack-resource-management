import { Request, Response, NextFunction } from 'express';
import { getMyProfileService, updateMyProfileService, uploadAvatarService } from './users.service';

export async function getMyProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accountId = req.user!.id;
    const profile = await getMyProfileService(accountId);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateMyProfileController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const accountId = req.user!.id;
    const { full_name, display_name, department } = req.body;

    if (full_name !== undefined && typeof full_name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'full_name must be a string.',
          details: {},
        },
      });
      return;
    }

    if (display_name !== undefined && typeof display_name !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'display_name must be a string.',
          details: {},
        },
      });
      return;
    }

    if (department !== undefined && typeof department !== 'string') {
      res.status(422).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'department must be a string.',
          details: {},
        },
      });
      return;
    }

    const profile = await updateMyProfileService(accountId, {
      full_name,
      display_name,
      department,
    });

    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function uploadAvatarController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    await uploadAvatarService();
  } catch (err) {
    next(err);
  }
}