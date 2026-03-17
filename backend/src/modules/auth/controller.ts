import { Request, Response, NextFunction } from 'express';
import { registerService, loginService, refreshService, logoutService, verifyEmailService, 
  forgotPasswordService, resetPasswordService, handleOAuthCallbackService } from './services';
import crypto from 'crypto';
import passport from 'passport';
import { env } from '../../config/env';

export async function registerController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const result = await registerService(req.body);

    res.status(201).json({
      id: result.id,
      email: result.email,
      is_verified: result.is_verified,
      created_at: result.created_at,
    });
  } catch (err) {
    next(err);
  }
}

export async function loginController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const userAgent = req.headers['user-agent'];
    const ipAddress = req.ip;

    const result = await loginService(req.body, userAgent, ipAddress);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(200).json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: 900,
    });
  } catch (err) {
    next(err);
  }
}

export async function refreshController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies['refresh_token'];

    if (!rawToken) {
      res.status(401).json({
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: 'Refresh token is missing.',
          details: {},
        },
      });
      return;
    }

    const result = await refreshService(rawToken);

    res.cookie('refresh_token', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(200).json({
      access_token: result.accessToken,
      token_type: 'Bearer',
      expires_in: 900,
    });
  } catch (err) {
    next(err);
  }
}

export async function logoutController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawToken = req.cookies['refresh_token'];

    if (rawToken) {
      await logoutService(rawToken);
    }

    res.clearCookie('refresh_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
    });

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}

export async function verifyEmailController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const token = req.query['token'] as string;

    if (!token) {
      res.status(400).json({
        error: {
          code: 'MISSING_TOKEN',
          message: 'Verification token is missing.',
          details: {},
        },
      });
      return;
    }

    const result = await verifyEmailService(token);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function forgotPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { email } = req.body;

    if (!email) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELD',
          message: 'Email is required.',
          details: {},
        },
      });
      return;
    }

    await forgotPasswordService(email);

    res.status(202).end();
  } catch (err) {
    next(err);
  }
}

export async function resetPasswordController(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { token, password } = req.body;

    if (!token || !password) {
      res.status(400).json({
        error: {
          code: 'MISSING_FIELDS',
          message: 'Token and password are required.',
          details: {},
        },
      });
      return;
    }

    const result = await resetPasswordService(token, password);

    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function oauthRedirect(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { provider } = req.params;

    if (provider !== 'google' && provider !== 'github') {
      res.status(400).json({
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `OAuth provider '${provider}' is not supported.`,
          details: {},
        },
      });
      return;
    }

    const state = crypto.randomBytes(16).toString('hex');

    res.cookie('oauth_state', state, {
      httpOnly: true,
      signed: true,
      maxAge: 5 * 60 * 1000, // 5 minutes
      sameSite: 'lax',
    });

    const scope = provider === 'google'
      ? ['email', 'profile']
      : ['user:email'];

    passport.authenticate(provider, {
      session: false,
      state,
      scope,
    })(req, res, next);
  } catch (err) {
    next(err);
  }
}

export async function oauthCallback(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { provider } = req.params;

    if (provider !== 'google' && provider !== 'github') {
      res.status(400).json({
        error: {
          code: 'UNSUPPORTED_PROVIDER',
          message: `OAuth provider '${provider}' is not supported.`,
          details: {},
        },
      });
      return;
    }

    const stateFromCookie = req.signedCookies['oauth_state'];
    const stateFromQuery = req.query.state as string;

    if (!stateFromCookie || !stateFromQuery || stateFromCookie !== stateFromQuery) {
      res.status(400).json({
        error: {
          code: 'STATE_MISMATCH',
          message: 'OAuth state mismatch. Possible CSRF attempt.',
          details: {},
        },
      });
      return;
    }

    res.clearCookie('oauth_state');

    passport.authenticate(
      provider,
      { session: false },
      async (err: unknown, account: { id: string; email: string } | false) => {
        try {
          if (err) return next(err);

          if (!account) {
            return res.status(401).json({
              error: {
                code: 'OAUTH_FAILED',
                message: 'OAuth authentication failed.',
                details: {},
              },
            });
          }

          const { accessToken, refreshToken } = await handleOAuthCallbackService(
            account,
            req.headers['user-agent'],
            req.ip
          );

          res.cookie('refresh_token', refreshToken, {
            httpOnly: true,
            secure: env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: Number(env.SESSION_EXPIRES_IN),
          });

          res.redirect(
            `${env.FRONTEND_URL}/oauth/success?access_token=${accessToken}`
          );
        } catch (innerErr) {
          next(innerErr);
        }
      }
    )(req, res, next);
  } catch (err) {
    next(err);
  }
}