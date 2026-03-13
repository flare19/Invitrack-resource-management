import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, verifyEmailController } from './controller';

const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.get('/verify-email', verifyEmailController);

export default authRouter;