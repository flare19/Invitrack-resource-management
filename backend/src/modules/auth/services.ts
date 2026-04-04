import bcrypt from 'bcrypt';
import crypto from 'crypto';
import passport from 'passport';
import { env } from '../../config/env';
import { AppError } from '../../errors/AppError';
import { createAccount, findAccountByEmail, createSession, findSessionByTokenHash, updateSessionToken, deleteSession, 
  findEmailVerificationToken, markEmailVerificationTokenUsed, markAccountVerified, findAccountById, createPasswordResetToken, 
  findPasswordResetToken, markPasswordResetTokenUsed, updatePasswordHash, findOrCreateOAuthAccount, findSessionById, findSessionsByAccountId } from './repository';
import { sendPasswordResetEmail } from './email';
import { RegisterDTO, LoginDTO, AuthTokensDTO, RegisterResponseDTO, LoginResponseDTO, MessageResponseDTO } from './types';
import { SignOptions, sign, verify } from 'jsonwebtoken';
import { Strategy as GoogleStrategy, Profile as GoogleProfile } from 'passport-google-oauth20';
import { Strategy as GithubStrategy, Profile as GithubProfile } from 'passport-github2';
import jwt from 'jsonwebtoken';
import { createAuditEvent } from '../audit/audit.service';

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

  createAuditEvent({
    actorId: account.id,
    actorEmail: account.email,
    action: 'auth.account.registered',
    module: 'auth',
    targetType: 'account',
    targetId: account.id,
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

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

  // loginService — after createSession, before return tokens
  createAuditEvent({
    actorId: account.id,
    actorEmail: account.email,
    action: 'auth.account.login',
    module: 'auth',
    targetType: 'account',
    targetId: account.id,
    ...(ipAddress !== undefined && { ipAddress }),
    ...(userAgent !== undefined && { userAgent }),
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

  return tokens;
}

export async function refreshService(rawToken: string): Promise<AuthTokensDTO> {
  const tokenHash = hashToken(rawToken);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token not found.');
  }

  if (session.expiresAt < new Date()) {
    throw new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired.');
  }

  try {
    verify(rawToken, env.JWT_REFRESH_SECRET);
  } catch {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid.');
  }

  const account = await findAccountById(session.accountId);

  if (!account) {
    throw new AppError(401, 'INVALID_REFRESH_TOKEN', 'Account no longer exists.');
  }

  const newTokens = generateTokens(account.id, account.email);
  const newTokenHash = hashToken(newTokens.refreshToken);
  const newExpiresAt = new Date(Date.now() + env.SESSION_EXPIRES_IN);

  await updateSessionToken(session.id, newTokenHash, newExpiresAt);

  return newTokens;
}

export async function logoutService(rawToken: string): Promise<void> {
  const tokenHash = hashToken(rawToken);
  const session = await findSessionByTokenHash(tokenHash);

  if (!session) {
    return; // Already gone — treat as success, just clear the cookie
  }

  await deleteSession(session.id);

  createAuditEvent({
    actorId: session.accountId,
    action: 'auth.account.logout',
    module: 'auth',
    targetType: 'account',
    targetId: session.accountId,
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));
}

export async function verifyEmailService(rawToken: string): Promise<MessageResponseDTO> {
  const tokenHash = hashToken(rawToken);
  const record = await findEmailVerificationToken(tokenHash);

  if (!record) {
    throw new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid.');
  }

  if (record.expires_at < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired.');
  }

  if (record.used_at !== null) {
    throw new AppError(400, 'TOKEN_ALREADY_USED', 'Verification token has already been used.');
  }

  await markEmailVerificationTokenUsed(record.id);
  await markAccountVerified(record.account_id);

  return { message: 'Email verified successfully.' };
}

export async function forgotPasswordService(email: string): Promise<void> {
  const account = await findAccountByEmail(email);

  if (!account) return; // silent exit — anti-enumeration

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await createPasswordResetToken(account.id, tokenHash, expiresAt);

  const resetUrl = `${process.env['APP_URL']}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail(account.email, resetUrl);
}

export async function resetPasswordService(
  rawToken: string,
  newPassword: string
): Promise<MessageResponseDTO> {
  const tokenHash = hashToken(rawToken);
  const record = await findPasswordResetToken(tokenHash);

  if (!record) {
    throw new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid.');
  }

  if (record.expiresAt < new Date()) {
    throw new AppError(400, 'TOKEN_EXPIRED', 'Password reset token has expired.');
  }

  if (record.usedAt !== null) {
    throw new AppError(400, 'TOKEN_ALREADY_USED', 'Password reset token has already been used.');
  }

  const newPasswordHash = await bcrypt.hash(newPassword, 12);

  await markPasswordResetTokenUsed(record.id);
  await updatePasswordHash(record.accountId, newPasswordHash);

  createAuditEvent({
    actorId: record.accountId,
    action: 'auth.account.password_reset',
    module: 'auth',
    targetType: 'account',
    targetId: record.accountId,
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

  return { message: 'Password updated successfully.' };
}

export function configureOAuthStrategies(): void {
  passport.use(
    new GoogleStrategy(
      {
        clientID: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_BASE_URL}/api/v1/auth/oauth/google/callback`,
      },
      async (_accessToken: string,
            _refreshToken: string,
            profile: GoogleProfile,
            done: (error: unknown, user?: Express.User | false) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          const fullName = profile.displayName ?? 'Google User';

          if (!email) {
            return done(new AppError(400, 'OAUTH_NO_EMAIL', 'No email returned from Google.'));
          }

          const result = await findOrCreateOAuthAccount(
            'google',
            profile.id,
            email,
            fullName
          );

          if (result.conflict) {
            return done(new AppError(409, 'EMAIL_CONFLICT', 'This email is already registered with a password. Please log in with email and password.'));
          }

          return done(null, result.account!);
        } catch (err) {
          return done(err);
        }
      }
    )
  );

  passport.use(
    new GithubStrategy(
      {
        clientID: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
        callbackURL: `${env.OAUTH_CALLBACK_BASE_URL}/api/v1/auth/oauth/github/callback`,
      },
      async (_accessToken: string,
            _refreshToken: string,
            profile: GithubProfile,
            done: (error: unknown, user?: Express.User | false) => void) => {
        try {
          const email = profile.emails?.[0]?.value;
          const fullName = profile.displayName ?? profile.username ?? 'GitHub User';

          if (!email) {
            return done(new AppError(400, 'OAUTH_NO_EMAIL', 'No email returned from GitHub.'));
          }

          const result = await findOrCreateOAuthAccount(
            'github',
            profile.id,
            email,
            fullName
          );

          if (result.conflict) {
            return done(new AppError(409, 'EMAIL_CONFLICT', 'This email is already registered with a password. Please log in with email and password.'));
          }

          return done(null, result.account!);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
}

export async function handleOAuthCallbackService(
  account: { id: string; email: string },
  userAgent: string | undefined,
  ipAddress: string | undefined
): Promise<{ accessToken: string; refreshToken: string }> {
  const rawRefreshToken = crypto.randomBytes(32).toString('hex');
  const hashedRefreshToken = hashToken(rawRefreshToken);

  const expiresAt = new Date(Date.now() + Number(env.SESSION_EXPIRES_IN));

  await createSession(
    account.id,
    hashedRefreshToken,
    expiresAt,
    userAgent,
    ipAddress
  );

  const accessToken = jwt.sign(
    { sub: account.id, email: account.email },
    env.JWT_ACCESS_SECRET,
    { expiresIn: '15m' }
  );

  // handleOAuthCallbackService — after createSession, before return
  createAuditEvent({
    actorId: account.id,
    actorEmail: account.email,
    action: 'auth.account.login',
    module: 'auth',
    targetType: 'account',
    targetId: account.id,
    ...(ipAddress !== undefined && { ipAddress }),
    ...(userAgent !== undefined && { userAgent }),
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));

  return { accessToken, refreshToken: rawRefreshToken };
}

export async function getSessionsService(accountId: string) {
  return findSessionsByAccountId(accountId);
}

export async function deleteSessionService(
  sessionId: string,
  requestingAccountId: string
): Promise<void> {
  const session = await findSessionById(sessionId);

  if (!session) {
    throw new AppError(404, 'SESSION_NOT_FOUND', 'Session not found.');
  }

  if (session.accountId !== requestingAccountId) {
    throw new AppError(403, 'FORBIDDEN', 'You cannot delete another account\'s session.');
  }

  await deleteSession(session.id);

  createAuditEvent({
    actorId: requestingAccountId,
    action: 'auth.session.revoked',
    module: 'auth',
    targetType: 'session',
    targetId: sessionId,
  }).catch((err) => console.error('[audit] Failed to write audit event:', err));
}