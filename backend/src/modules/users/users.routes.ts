import { Router } from 'express';
import { getMyProfileController, updateMyProfileController, uploadAvatarController } from './users.controller';
import { authenticate } from '../auth/middleware';

const usersRouter = Router();

usersRouter.get('/me', authenticate, getMyProfileController);
usersRouter.patch('/me', authenticate, updateMyProfileController);
usersRouter.post('/me/avatar', authenticate, uploadAvatarController);

export default usersRouter;