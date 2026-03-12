import * as dotenv from 'dotenv';

dotenv.config();

function required(key: string): string {
  const value = process.env[key];
  if (!value) throw new Error(`Missing required environment variable: ${key}`);
  return value;
}

export const env = {
  // Server
  PORT: parseInt(process.env.PORT ?? '5000', 10),
  NODE_ENV: process.env.NODE_ENV ?? 'development',

  // Database
  DATABASE_URL: required('DATABASE_URL'),

  // JWT
  JWT_ACCESS_SECRET: required('JWT_ACCESS_SECRET'),
  JWT_REFRESH_SECRET: required('JWT_REFRESH_SECRET'),
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN ?? '15m',
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',

  // Cookie
  COOKIE_SECRET: required('COOKIE_SECRET'),

  // CORS
  FRONTEND_URL: required('FRONTEND_URL'),
  API_BASE_URL: process.env.API_BASE_URL ?? 'http://localhost:5000',

  // OAuth
  GOOGLE_CLIENT_ID: required('GOOGLE_CLIENT_ID'),
  GOOGLE_CLIENT_SECRET: required('GOOGLE_CLIENT_SECRET'),
  GOOGLE_REDIRECT_URI: required('GOOGLE_REDIRECT_URI'),

  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS ?? '900000', 10),
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS ?? '100', 10),

  // Bcrypt
  BCRYPT_SALT_ROUNDS: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),

  //Session
  SESSION_EXPIRES_IN: parseInt(process.env.SESSION_EXPIRES_IN ?? '86400000', 10),

  // Logging
  LOG_LEVEL: process.env.LOG_LEVEL ?? 'info',

  // AWS
  AWS_REGION: process.env.AWS_REGION ?? 'us-east-1',
  AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
} as const;