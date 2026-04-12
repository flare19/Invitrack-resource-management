import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, verifyEmailController, 
    forgotPasswordController, resetPasswordController, oauthCallback, oauthRedirect, getSessionsController, deleteSessionController } from './controller';
import { authenticate } from './middleware';

const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.post('/verify-email', verifyEmailController);
authRouter.post('/forgot-password', forgotPasswordController);
authRouter.post('/reset-password', resetPasswordController);
authRouter.get('/oauth/:provider', oauthRedirect);
authRouter.get('/oauth/:provider/callback', oauthCallback);
authRouter.get('/sessions', authenticate, getSessionsController);
authRouter.delete('/sessions/:id', authenticate, deleteSessionController);

export default authRouter;