// src/modules/auth/middleware.ts

import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { findAccountWithPermissions } from './repository';

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed authorization header');
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
    throw new AppError(401, 'UNAUTHORIZED', 'Missing or malformed authorization header');
    }

    let payload: { sub: string };
    try {
      payload = jwt.verify(token, env.JWT_ACCESS_SECRET!) as { sub: string };
    } catch {
      throw new AppError(401, 'UNAUTHORIZED', 'Invalid or expired access token');
    }

    const account = await findAccountWithPermissions(payload.sub);

    if (!account) {
      throw new AppError(401, 'UNAUTHORIZED', 'Account not found');
    }

    if (!account.isActive) {
      throw new AppError(401, 'UNAUTHORIZED', 'Account is inactive');
    }

    req.user = {
      id: account.id,
      email: account.email,
      roles: account.roles,
      permissions: account.permissions,
    };

    next();
  } catch (err) {
    next(err);
  }
}

export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Unauthenticated'));
    }

    const hasRole = roles.some((role) => req.user!.roles.includes(role));

    if (!hasRole) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient role'));
    }

    next();
  };
}

export function requirePermission(...perms: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Unauthenticated'));
    }

    const hasPermission = perms.some((perm) => req.user!.permissions.includes(perm));

    if (!hasPermission) {
      return next(new AppError(403, 'FORBIDDEN', 'Insufficient permissions'));
    }

    next();
  };
}