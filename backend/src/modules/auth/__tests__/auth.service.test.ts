import bcrypt from 'bcrypt';
import { AppError } from '../../../errors/AppError';
import {
  registerService,
  loginService,
  refreshService,
  logoutService,
  verifyEmailService,
  forgotPasswordService,
  resetPasswordService,
} from '../services';

// ─── Mock the entire repository module ───────────────────────────────────────
jest.mock('../repository');
// ─── Mock the email module ────────────────────────────────────────────────────
jest.mock('../email');
// ─── Mock the audit module ────────────────────────────────────────────────────
jest.mock('../../../modules/audit/audit.service');
// ─── Mock env config ──────────────────────────────────────────────────────────
jest.mock('../../../config/env', () => ({
  env: {
    JWT_ACCESS_SECRET: 'test-access-secret',
    JWT_REFRESH_SECRET: 'test-refresh-secret',
    JWT_ACCESS_EXPIRES_IN: '15m',
    JWT_REFRESH_EXPIRES_IN: '7d',
    BCRYPT_SALT_ROUNDS: 10,
    SESSION_EXPIRES_IN: 604800000, // 7 days in ms
    GOOGLE_CLIENT_ID: 'test',
    GOOGLE_CLIENT_SECRET: 'test',
    GITHUB_CLIENT_ID: 'test',
    GITHUB_CLIENT_SECRET: 'test',
    OAUTH_CALLBACK_BASE_URL: 'http://localhost:3000',
  },
}));

// ─── Import mocked repository functions ──────────────────────────────────────
import {
  findAccountByEmail,
  createAccount,
  createSession,
  findSessionByTokenHash,
  findAccountById,
  updateSessionToken,
  deleteSession,
  findEmailVerificationToken,
  markEmailVerificationTokenUsed,
  markAccountVerified,
  createPasswordResetToken,
  findPasswordResetToken,
  markPasswordResetTokenUsed,
  updatePasswordHash,
} from '../repository';
import { sendPasswordResetEmail, sendVerificationEmail } from '../email';
import { createAuditEvent } from '../../../modules/audit/audit.service';

// Cast all mocked imports so TypeScript knows they are Jest mocks
const mockFindAccountByEmail = findAccountByEmail as jest.MockedFunction<typeof findAccountByEmail>;
const mockCreateAccount = createAccount as jest.MockedFunction<typeof createAccount>;
const mockCreateSession = createSession as jest.MockedFunction<typeof createSession>;
const mockFindSessionByTokenHash = findSessionByTokenHash as jest.MockedFunction<typeof findSessionByTokenHash>;
const mockFindAccountById = findAccountById as jest.MockedFunction<typeof findAccountById>;
const mockUpdateSessionToken = updateSessionToken as jest.MockedFunction<typeof updateSessionToken>;
const mockDeleteSession = deleteSession as jest.MockedFunction<typeof deleteSession>;
const mockFindEmailVerificationToken = findEmailVerificationToken as jest.MockedFunction<typeof findEmailVerificationToken>;
const mockMarkEmailVerificationTokenUsed = markEmailVerificationTokenUsed as jest.MockedFunction<typeof markEmailVerificationTokenUsed>;
const mockMarkAccountVerified = markAccountVerified as jest.MockedFunction<typeof markAccountVerified>;
const mockCreatePasswordResetToken = createPasswordResetToken as jest.MockedFunction<typeof createPasswordResetToken>;
const mockFindPasswordResetToken = findPasswordResetToken as jest.MockedFunction<typeof findPasswordResetToken>;
const mockMarkPasswordResetTokenUsed = markPasswordResetTokenUsed as jest.MockedFunction<typeof markPasswordResetTokenUsed>;
const mockUpdatePasswordHash = updatePasswordHash as jest.MockedFunction<typeof updatePasswordHash>;
const mockSendPasswordResetEmail = sendPasswordResetEmail as jest.MockedFunction<typeof sendPasswordResetEmail>;
const mockSendVerificationEmail = sendVerificationEmail as jest.MockedFunction<typeof sendVerificationEmail>;
const mockCreateAuditEvent = createAuditEvent as jest.MockedFunction<typeof createAuditEvent>;

// ─── Shared test fixtures ─────────────────────────────────────────────────────
const fakeAccount = {
  id: 'account-uuid-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  isVerified: true,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const fakeSession = {
  id: 'session-uuid-123',
  accountId: fakeAccount.id,
  refreshToken: 'hashed-token',
  expiresAt: new Date(Date.now() + 604800000), // valid: 7 days from now
  createdAt: new Date(),
  userAgent: null, // <-- Add this
  ipAddress: null, // <-- Add this
};

// ─── Clear all mocks between tests ───────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockSendVerificationEmail.mockResolvedValue(undefined as any);
  mockCreateAuditEvent.mockResolvedValue(undefined as any);
});

// ═════════════════════════════════════════════════════════════════════════════
// registerService
// ═════════════════════════════════════════════════════════════════════════════
describe('registerService', () => {
  const registerData = {
    email: 'new@example.com',
    password: 'password123',
    full_name: 'New User',
  };

  it('creates an account and returns response DTO on success', async () => {
    mockFindAccountByEmail.mockResolvedValue(null);
    mockCreateAccount.mockResolvedValue({
      ...fakeAccount,
      email: registerData.email,
      isVerified: false,
    });
    mockCreateSession.mockResolvedValue(undefined as any);

    const result = await registerService(registerData);

    expect(mockFindAccountByEmail).toHaveBeenCalledWith(registerData.email);
    expect(mockCreateAccount).toHaveBeenCalledTimes(1);
    expect(mockCreateSession).toHaveBeenCalledTimes(1);
    expect(result.email).toBe(registerData.email);
    expect(result.is_verified).toBe(false);
    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
  });

  it('throws 409 if email is already registered', async () => {
    mockFindAccountByEmail.mockResolvedValue(fakeAccount);

    await expect(registerService(registerData)).rejects.toThrow(
      new AppError(409, 'EMAIL_ALREADY_EXISTS', 'Email already registered.')
    );
    expect(mockCreateAccount).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// loginService
// ═════════════════════════════════════════════════════════════════════════════
describe('loginService', () => {
  const loginData = { email: fakeAccount.email, password: 'correct-password' };

  beforeEach(() => {
    // Default: account exists, password matches
    mockFindAccountByEmail.mockResolvedValue(fakeAccount);
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
    mockCreateSession.mockResolvedValue(undefined as any);
  });

  it('returns access and refresh tokens on valid credentials', async () => {
    const result = await loginService(loginData, 'Mozilla/5.0', '127.0.0.1');

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockCreateSession).toHaveBeenCalledWith(
      fakeAccount.id,
      expect.any(String),
      expect.any(Date),
      'Mozilla/5.0',
      '127.0.0.1'
    );
  });

  it('throws 401 if account does not exist', async () => {
    mockFindAccountByEmail.mockResolvedValue(null);

    await expect(loginService(loginData)).rejects.toThrow(
      new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    );
  });

  it('throws 403 if account is inactive', async () => {
    mockFindAccountByEmail.mockResolvedValue({ ...fakeAccount, isActive: false });

    await expect(loginService(loginData)).rejects.toThrow(
      new AppError(403, 'ACCOUNT_INACTIVE', 'Account is disabled.')
    );
  });

  it('throws 403 if email is not verified', async () => {
    mockFindAccountByEmail.mockResolvedValue({ ...fakeAccount, isVerified: false });

    await expect(loginService(loginData)).rejects.toThrow(
      new AppError(403, 'EMAIL_NOT_VERIFIED', 'Please verify your email before logging in.')
    );
  });

  it('throws 401 if account has no password hash (OAuth-only account)', async () => {
    mockFindAccountByEmail.mockResolvedValue({ ...fakeAccount, passwordHash: null });

    await expect(loginService(loginData)).rejects.toThrow(
      new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    );
  });

  it('throws 401 if password does not match', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

    await expect(loginService(loginData)).rejects.toThrow(
      new AppError(401, 'INVALID_CREDENTIALS', 'Invalid email or password.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// refreshService
// ═════════════════════════════════════════════════════════════════════════════
describe('refreshService', () => {
  // We need a real JWT to pass the verify() call inside refreshService.
  // Generate one with the same secret used in the mock env.
  const { sign } = jest.requireActual('jsonwebtoken') as typeof import('jsonwebtoken');
  const validRawToken = sign({ sub: fakeAccount.id }, 'test-refresh-secret', { expiresIn: '7d' });

  it('returns new tokens when session is valid', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(fakeSession);
    mockFindAccountById.mockResolvedValue(fakeAccount);
    mockUpdateSessionToken.mockResolvedValue(undefined as any);

    const result = await refreshService(validRawToken);

    expect(result.accessToken).toBeDefined();
    expect(result.refreshToken).toBeDefined();
    expect(mockUpdateSessionToken).toHaveBeenCalledTimes(1);
  });

  it('throws 401 if session is not found', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(null);

    await expect(refreshService(validRawToken)).rejects.toThrow(
      new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token not found.')
    );
  });

  it('throws 401 if session is expired', async () => {
    mockFindSessionByTokenHash.mockResolvedValue({
      ...fakeSession,
      expiresAt: new Date(Date.now() - 1000), // expired 1 second ago
    });

    await expect(refreshService(validRawToken)).rejects.toThrow(
      new AppError(401, 'REFRESH_TOKEN_EXPIRED', 'Refresh token has expired.')
    );
  });

  it('throws 401 if jwt.verify fails (tampered token)', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(fakeSession);

    await expect(refreshService('this.is.not.a.valid.jwt')).rejects.toThrow(
      new AppError(401, 'INVALID_REFRESH_TOKEN', 'Refresh token is invalid.')
    );
  });

  it('throws 401 if account no longer exists', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(fakeSession);
    mockFindAccountById.mockResolvedValue(null);

    await expect(refreshService(validRawToken)).rejects.toThrow(
      new AppError(401, 'INVALID_REFRESH_TOKEN', 'Account no longer exists.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// logoutService
// ═════════════════════════════════════════════════════════════════════════════
describe('logoutService', () => {
  it('deletes the session when token is found', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(fakeSession);
    mockDeleteSession.mockResolvedValue(undefined as any);

    await logoutService('some-raw-token');

    expect(mockDeleteSession).toHaveBeenCalledWith(fakeSession.id);
  });

  it('does nothing if session is not found (idempotent)', async () => {
    mockFindSessionByTokenHash.mockResolvedValue(null);

    await expect(logoutService('some-raw-token')).resolves.toBeUndefined();
    expect(mockDeleteSession).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// verifyEmailService
// ═════════════════════════════════════════════════════════════════════════════
describe('verifyEmailService', () => {
  const fakeVerificationToken = {
    id: 'token-uuid-123',
    account_id: fakeAccount.id,
    token_hash: 'hashed-token',
    expires_at: new Date(Date.now() + 3600000), // valid: 1 hour from now
    used_at: null,
    created_at: new Date(),
  };

  it('marks account verified and token used on success', async () => {
    mockFindEmailVerificationToken.mockResolvedValue(fakeVerificationToken);
    mockMarkEmailVerificationTokenUsed.mockResolvedValue(undefined as any);
    mockMarkAccountVerified.mockResolvedValue(undefined as any);

    const result = await verifyEmailService('raw-token');

    expect(mockMarkEmailVerificationTokenUsed).toHaveBeenCalledWith(fakeVerificationToken.id);
    expect(mockMarkAccountVerified).toHaveBeenCalledWith(fakeVerificationToken.account_id);
    expect(result.message).toBe('Email verified successfully.');
  });

  it('throws 400 if token is not found', async () => {
    mockFindEmailVerificationToken.mockResolvedValue(null);

    await expect(verifyEmailService('bad-token')).rejects.toThrow(
      new AppError(400, 'INVALID_TOKEN', 'Verification token is invalid.')
    );
  });

  it('throws 400 if token is expired', async () => {
    mockFindEmailVerificationToken.mockResolvedValue({
      ...fakeVerificationToken,
      expires_at: new Date(Date.now() - 1000), // expired
    });

    await expect(verifyEmailService('raw-token')).rejects.toThrow(
      new AppError(400, 'TOKEN_EXPIRED', 'Verification token has expired.')
    );
  });

  it('throws 400 if token has already been used', async () => {
    mockFindEmailVerificationToken.mockResolvedValue({
      ...fakeVerificationToken,
      used_at: new Date(), // already consumed
    });

    await expect(verifyEmailService('raw-token')).rejects.toThrow(
      new AppError(400, 'TOKEN_ALREADY_USED', 'Verification token has already been used.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// forgotPasswordService
// ═════════════════════════════════════════════════════════════════════════════
describe('forgotPasswordService', () => {
  it('creates a reset token and sends email when account exists', async () => {
    mockFindAccountByEmail.mockResolvedValue(fakeAccount);
    mockCreatePasswordResetToken.mockResolvedValue(undefined as any);
    mockSendPasswordResetEmail.mockResolvedValue(undefined as any);

    await forgotPasswordService(fakeAccount.email);

    expect(mockCreatePasswordResetToken).toHaveBeenCalledTimes(1);
    expect(mockSendPasswordResetEmail).toHaveBeenCalledWith(
      fakeAccount.email,
      expect.stringContaining('reset-password')
    );
  });

  it('returns silently when account does not exist (anti-enumeration)', async () => {
    mockFindAccountByEmail.mockResolvedValue(null);

    await expect(forgotPasswordService('nobody@example.com')).resolves.toBeUndefined();
    expect(mockCreatePasswordResetToken).not.toHaveBeenCalled();
    expect(mockSendPasswordResetEmail).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// resetPasswordService
// ═════════════════════════════════════════════════════════════════════════════
describe('resetPasswordService', () => {
  const fakeResetToken = {
    id: 'reset-token-uuid-123',
    accountId: fakeAccount.id,
    tokenHash: 'hashed-reset-token',
    expiresAt: new Date(Date.now() + 3600000), // valid: 1 hour from now
    usedAt: null,
    createdAt: new Date(),
  };

  it('updates password hash and marks token used on success', async () => {
    mockFindPasswordResetToken.mockResolvedValue(fakeResetToken);
    mockMarkPasswordResetTokenUsed.mockResolvedValue(undefined as any);
    mockUpdatePasswordHash.mockResolvedValue(undefined as any);

    const result = await resetPasswordService('raw-token', 'newPassword123');

    expect(mockMarkPasswordResetTokenUsed).toHaveBeenCalledWith(fakeResetToken.id);
    expect(mockUpdatePasswordHash).toHaveBeenCalledWith(
      fakeResetToken.accountId,
      expect.any(String) // bcrypt hash — we don't assert the exact value
    );
    expect(result.message).toBe('Password updated successfully.');
  });

  it('throws 400 if token is not found', async () => {
    mockFindPasswordResetToken.mockResolvedValue(null);

    await expect(resetPasswordService('bad-token', 'newPassword123')).rejects.toThrow(
      new AppError(400, 'INVALID_TOKEN', 'Password reset token is invalid.')
    );
  });

  it('throws 400 if token is expired', async () => {
    mockFindPasswordResetToken.mockResolvedValue({
      ...fakeResetToken,
      expiresAt: new Date(Date.now() - 1000),
    });

    await expect(resetPasswordService('raw-token', 'newPassword123')).rejects.toThrow(
      new AppError(400, 'TOKEN_EXPIRED', 'Password reset token has expired.')
    );
  });

  it('throws 400 if token has already been used', async () => {
    mockFindPasswordResetToken.mockResolvedValue({
      ...fakeResetToken,
      usedAt: new Date(),
    });

    await expect(resetPasswordService('raw-token', 'newPassword123')).rejects.toThrow(
      new AppError(400, 'TOKEN_ALREADY_USED', 'Password reset token has already been used.')
    );
  });
});