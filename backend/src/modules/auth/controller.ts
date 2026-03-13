import { Request, Response, NextFunction } from 'express';
import { registerService, loginService, refreshService, logoutService, verifyEmailService } from './services';

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