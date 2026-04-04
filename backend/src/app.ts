import express, { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import passport from 'passport';
import cookieParser from 'cookie-parser';
import { env } from './config/env';
import { AppError } from './errors/AppError';
import authRouter from './modules/auth/routes';
import usersRouter from './modules/users/users.routes';
import { configureOAuthStrategies } from './modules/auth/services';
import inventoryRouter from './modules/inventory/inventory.routes';
import bookingsRouter from './modules/bookings/bookings.routes';
import auditRouter from './modules/audit/audit.routes';
import analyticsRouter from './modules/analytics/analytics.routes';
import { startAnalyticsJobs } from './modules/analytics/analytics.jobs';

const app = express();

app.use(helmet());
app.use(cors({ origin: env.FRONTEND_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser(env.COOKIE_SECRET));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));

configureOAuthStrategies();

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);
app.use('/api/v1/inventory', inventoryRouter);
app.use('/api/v1/bookings', bookingsRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/analytics', analyticsRouter);
startAnalyticsJobs();

// 404
app.use((_req: Request, _res: Response, next: NextFunction) => {
  next(new AppError(404, 'NOT_FOUND', 'The requested resource does not exist.'));
});

// Global error handler
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        details: err.details ?? {},
      },
    });
  }

  // Unexpected error
  console.error(err);
  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred.',
      details: {},
    },
  });
});

export default app;