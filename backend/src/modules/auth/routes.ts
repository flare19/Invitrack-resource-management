import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, verifyEmailController, 
    forgotPasswordController, resetPasswordController, oauthCallback, oauthRedirect, getSessionsController, deleteSessionController } from './controller';
import { authenticate } from './middleware';
import {
  loginLimiter,
  registerLimiter,
  forgotPasswordLimiter,
  resetPasswordLimiter,
} from '../../middleware/rateLimiter';

const authRouter = Router();

authRouter.post('/register', registerLimiter, registerController);
authRouter.post('/login', loginLimiter, loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.post('/verify-email', verifyEmailController);
authRouter.post('/forgot-password', forgotPasswordLimiter, forgotPasswordController);
authRouter.post('/reset-password', resetPasswordLimiter, resetPasswordController);
authRouter.get('/oauth/:provider', oauthRedirect);
authRouter.get('/oauth/:provider/callback', oauthCallback);
authRouter.get('/sessions', authenticate, getSessionsController);
authRouter.delete('/sessions/:id', authenticate, deleteSessionController);

export default authRouter;