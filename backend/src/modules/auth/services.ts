import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { createAccount, findAccountByEmail, createSession } from './repository';
import { RegisterDTO, LoginDTO, AuthTokensDTO, RegisterResponseDTO } from './types';
import { SignOptions, sign } from 'jsonwebtoken';

function generateTokens(accountId: string, email: string): AuthTokensDTO {
  const accessToken = sign(
    { sub: accountId, email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: env.JWT_ACCESS_EXPIRES_IN as string & SignOptions['expiresIn'] }
  );

  const refreshToken = sign(
    { sub: accountId },
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN as string & SignOptions['expiresIn'] }
  );

  return { accessToken, refreshToken };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

export async function registerService(data: RegisterDTO): Promise<RegisterResponseDTO> {
  const existing = await findAccountByEmail(data.email);
  if (existing) {
    throw new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered.');
  }

  const hashedPassword = await bcrypt.hash(data.password, env.BCRYPT_SALT_ROUNDS);
  const account = await createAccount(data, hashedPassword);

  const tokens = generateTokens(account.id, account.email);

  const refreshTokenHash = hashToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + env.SESSION_EXPIRES_IN);

  await createSession(account.id, refreshTokenHash, expiresAt);

  return {
    id: account.id,
    email: account.email,
    is_verified: account.isVerified,
    created_at: account.createdAt,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
  };
}

export async function loginService(data: LoginDTO, userAgent?: string, ipAddress?: string): Promise<AuthTokensDTO> {
  const account = await findAccountByEmail(data.email);
  if (!account) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  if (!account.isActive) {
    throw new AppError(403, 'ACCOUNT_INACTIVE', 'Account is disabled.');
  }

  if (!account.isVerified) {
    throw new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.');
  }

  if (!account.passwordHash) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const passwordMatch = await bcrypt.compare(data.password, account.passwordHash);
  if (!passwordMatch) {
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.');
  }

  const tokens = generateTokens(account.id, account.email);

  const refreshTokenHash = hashToken(tokens.refreshToken);
  const expiresAt = new Date(Date.now() + env.SESSION_EXPIRES_IN);

  await createSession(account.id, refreshTokenHash, expiresAt, userAgent, ipAddress);

  return tokens;
}