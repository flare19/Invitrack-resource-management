import { AppError } from '../../errors/AppError';
import { Request, Response, NextFunction } from 'express';
import { getMyProfileService, updateMyProfileService, uploadAvatarService, listUsersService,
  getUserByIdService,
  updateUserByIdService,
  listRolesService,
  assignRoleService,
  removeRoleService,
  listPermissionsService,
  listRolePermissionsService,
  assignPermissionToRoleService,
  removePermissionFromRoleService } from './users.service';

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

// ─── Admin User Management ────────────────────────────────────────────────────

export async function listUsersController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const page = req.query.page !== undefined ? parseInt(req.query.page as string, 10) : undefined;
    const per_page = req.query.per_page !== undefined ? parseInt(req.query.per_page as string, 10) : undefined;

    if (page !== undefined && (isNaN(page) || page < 1)) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'page must be a positive integer.', details: {} },
      });
      return;
    }

    if (per_page !== undefined && (isNaN(per_page) || per_page < 1)) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'per_page must be a positive integer.', details: {} },
      });
      return;
    }

    const is_active =
      req.query.is_active === 'true'
        ? true
        : req.query.is_active === 'false'
          ? false
          : undefined;

    const result = await listUsersService({
  ...(page !== undefined && { page }),
  ...(per_page !== undefined && { per_page }),
  ...(req.query.department !== undefined && { department: req.query.department as string }),
  ...(req.query.role !== undefined && { role: req.query.role as string }),
  ...(is_active !== undefined && { is_active }),
});

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getUserByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const profile = await getUserByIdService(id);
    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

export async function updateUserByIdController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { full_name, display_name, department, is_active } = req.body;

    if (full_name !== undefined && typeof full_name !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'full_name must be a string.', details: {} },
      });
      return;
    }

    if (display_name !== undefined && typeof display_name !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'display_name must be a string.', details: {} },
      });
      return;
    }

    if (department !== undefined && typeof department !== 'string') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'department must be a string.', details: {} },
      });
      return;
    }

    if (is_active !== undefined && typeof is_active !== 'boolean') {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'is_active must be a boolean.', details: {} },
      });
      return;
    }

    const profile = await updateUserByIdService(id, {
      full_name,
      display_name,
      department,
      is_active,
    });

    res.status(200).json(profile);
  } catch (err) {
    next(err);
  }
}

// ─── Role Assignment ──────────────────────────────────────────────────────────

export async function listRolesController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const roles = await listRolesService();
    res.status(200).json(roles);
  } catch (err) {
    next(err);
  }
}

export async function assignRoleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const { role_id } = req.body;

    if (role_id === undefined || typeof role_id !== 'number' || !Number.isInteger(role_id)) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'role_id must be an integer.', details: {} },
      });
      return;
    }

    const result = await assignRoleService(id, role_id, req.user!.id);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function removeRoleController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = req.params['id'] as string;
    const roleId = parseInt(req.params['role_id'] as string, 10);

    if (isNaN(roleId)) {
      res.status(422).json({
        error: { code: 'VALIDATION_ERROR', message: 'role_id must be an integer.', details: {} },
      });
      return;
    }

    await removeRoleService(id, roleId);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

// src/modules/users/controller.ts (additions)

export async function listPermissionsController(req: Request, res: Response) {
  const permissions = await listPermissionsService();
  res.status(200).json(permissions);
}

export async function listRolePermissionsController(req: Request, res: Response) {
  const roleId = parseInt(req.params['role_id'] as string, 10);
  if (isNaN(roleId)) throw new AppError(400, 'INVALID_ROLE_ID', 'Role ID must be a number.');

  const permissions = await listRolePermissionsService(roleId);
  res.status(200).json(permissions);
}

export async function assignPermissionToRoleController(req: Request, res: Response) {
  const roleId = parseInt(req.params['role_id'] as string, 10);
  if (isNaN(roleId)) throw new AppError(400, 'INVALID_ROLE_ID', 'Role ID must be a number.');

  const { permission_id } = req.body as { permission_id: unknown };
  if (typeof permission_id !== 'number' || !Number.isInteger(permission_id)) {
    throw new AppError(422, 'VALIDATION_ERROR', 'permission_id must be an integer.');
  }

  const result = await assignPermissionToRoleService(roleId, permission_id);
  res.status(201).json({ role_id: result.roleId, permission_id: result.permissionId });
}

export async function removePermissionFromRoleController(req: Request, res: Response) {
  const roleId = parseInt(req.params['role_id'] as string, 10);
  const permissionId = parseInt(req.params['permission_id'] as string, 10);

  if (isNaN(roleId)) throw new AppError(400, 'INVALID_ROLE_ID', 'Role ID must be a number.');
  if (isNaN(permissionId)) throw new AppError(400, 'INVALID_PERMISSION_ID', 'Permission ID must be a number.');

  await removePermissionFromRoleService(roleId, permissionId);
  res.status(204).send();
}