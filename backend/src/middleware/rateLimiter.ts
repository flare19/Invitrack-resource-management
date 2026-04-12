import rateLimit from 'express-rate-limit';

/**
 * Shared error shape so rate-limit rejections match the app's error envelope.
 */
const rateLimitHandler = (
  _req: import('express').Request,
  res: import('express').Response
) => {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      details: {},
    },
  });
};

/** POST /auth/login — brute-force protection */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** POST /auth/register — spam account creation */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 60 minutes
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** POST /auth/forgot-password — email flooding / enumeration */
export const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});

/** POST /auth/reset-password — token brute-force */
export const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: rateLimitHandler,
});