import { Router } from 'express';
import { registerController, loginController, refreshController, logoutController, verifyEmailController, 
    forgotPasswordController, resetPasswordController, oauthCallback, oauthRedirect } from './controller';

const authRouter = Router();

authRouter.post('/register', registerController);
authRouter.post('/login', loginController);
authRouter.post('/refresh', refreshController);
authRouter.post('/logout', logoutController);
authRouter.get('/verify-email', verifyEmailController);
authRouter.post('/forgot-password', forgotPasswordController);
authRouter.post('/reset-password', resetPasswordController);
authRouter.get('/oauth/:provider', oauthRedirect);
authRouter.get('/oauth/:provider/callback', oauthCallback);

export default authRouter;