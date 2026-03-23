import { Router } from 'express';
import {
  getMyProfileController,
  updateMyProfileController,
  uploadAvatarController,
  listUsersController,
  getUserByIdController,
  updateUserByIdController,
  listRolesController,
  assignRoleController,
  removeRoleController,
} from './users.controller';
import { authenticate, requireRole } from '../auth/middleware';

const usersRouter = Router();

// ─── Authenticated user (self) ────────────────────────────────────────────────
usersRouter.get('/me', authenticate, getMyProfileController);
usersRouter.patch('/me', authenticate, updateMyProfileController);
usersRouter.post('/me/avatar', authenticate, uploadAvatarController);

// ─── Roles (static — must come before /:id) ───────────────────────────────────
usersRouter.get('/roles', authenticate, listRolesController);

// ─── User list and single user ────────────────────────────────────────────────
usersRouter.get('/', authenticate, requireRole('admin', 'manager'), listUsersController);
usersRouter.get('/:id', authenticate, requireRole('admin', 'manager'), getUserByIdController);
usersRouter.patch('/:id', authenticate, requireRole('admin'), updateUserByIdController);

// ─── Role assignment (parameterised — must come after /roles) ─────────────────
usersRouter.post('/:id/roles', authenticate, requireRole('admin'), assignRoleController);
usersRouter.delete('/:id/roles/:role_id', authenticate, requireRole('admin'), removeRoleController);

export default usersRouter;