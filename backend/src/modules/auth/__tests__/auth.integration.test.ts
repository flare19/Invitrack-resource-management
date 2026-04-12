import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import app from '../../../app';
import { PrismaClient } from '../../../generated/prisma';
import crypto from 'crypto';

// ─── Mock email so no real SMTP calls are made ────────────────────────────────
jest.mock('../email');

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

async function registerAndLogin(email = 'test@example.com', password = 'password123') {
  // Directly insert a verified account so login works without email flow
  const bcrypt = await import('bcrypt');
  const passwordHash = await bcrypt.hash(password, 10);

  const account = await prisma.account.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      isVerified: true,
      profile: { create: { fullName: 'Test User' } },
      accountRoles: {
        create: {
          role: { connect: { name: 'employee' } },
        },
      },
    },
  });

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password });

  return {
    account,
    accessToken: res.body.access_token,
    refreshToken: res.headers['set-cookie']?.[0], // raw cookie string
    loginRes: res,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/register
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/register', () => {
  it('returns 201 with correct response shape', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'newuser@example.com', password: 'password123', full_name: 'New User' });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      email: 'newuser@example.com',
      is_verified: false,
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.created_at).toBeDefined();
  });

  it('returns 409 if email is already registered', async () => {
    await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123', full_name: 'First User' });

    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'dupe@example.com', password: 'password123', full_name: 'Second User' });

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('EMAIL_ALREADY_EXISTS');
  });

  it('returns 422 if required fields are missing', async () => {
    const res = await request(app)
      .post('/api/v1/auth/register')
      .send({ email: 'incomplete@example.com' }); // missing password and full_name

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/login
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/login', () => {
  beforeEach(async () => {
    const bcrypt = await import('bcrypt');
    const passwordHash = await bcrypt.hash('password123', 10);
    await prisma.account.create({
      data: {
        email: 'login@example.com',
        passwordHash,
        isVerified: true,
        profile: { create: { fullName: 'Login User' } },
        accountRoles: { create: { role: { connect: { name: 'employee' } } } },
      },
    });
  });

  it('returns 200 with access token and sets refresh cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
    expect(res.body.token_type).toBe('Bearer');
    expect(res.body.expires_in).toBe(900);
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'wrongpassword' });

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('INVALID_CREDENTIALS');
  });

  it('returns 401 on unknown email', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'nobody@example.com', password: 'password123' });

    expect(res.status).toBe(401);
  });

  it('returns 403 if account is inactive', async () => {
    await prisma.account.update({
      where: { email: 'login@example.com' },
      data: { isActive: false },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('ACCOUNT_INACTIVE');
  });

  it('returns 403 if email is not verified', async () => {
    await prisma.account.update({
      where: { email: 'login@example.com' },
      data: { isVerified: false },
    });

    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'login@example.com', password: 'password123' });

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('EMAIL_NOT_VERIFIED');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/refresh
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/refresh', () => {
  it('returns 200 with new access token when cookie is valid', async () => {
    const { refreshToken } = await registerAndLogin('refresh@example.com');

    const res = await request(app)
      .post('/api/v1/auth/refresh')
      .set('Cookie', refreshToken!);

    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeDefined();
  });

  it('returns 401 if no refresh token cookie is present', async () => {
    const res = await request(app).post('/api/v1/auth/refresh');

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/logout
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/logout', () => {
  it('returns 204 and clears cookie', async () => {
    const { refreshToken } = await registerAndLogin('logout@example.com');

    const res = await request(app)
      .post('/api/v1/auth/logout')
      .set('Cookie', refreshToken!);

    expect(res.status).toBe(204);
    // Cookie should be cleared (set to empty/expired)
    const setCookie = res.headers['set-cookie']?.[0] ?? '';
    expect(setCookie).toContain('refresh_token=;');
  });

  it('returns 204 even with no cookie (idempotent)', async () => {
    const res = await request(app).post('/api/v1/auth/logout');
    expect(res.status).toBe(204);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/verify-email
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/verify-email', () => {
  it('returns 200 and verifies the account', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'verify@example.com',
        passwordHash: 'irrelevant',
        isVerified: false,
        profile: { create: { fullName: 'Verify User' } },
      },
    });

    const rawToken = 'test-verification-token-abc123';
    const tokenHash = hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 3600000);

    await prisma.emailVerificationToken.create({
      data: {
        account_id: account.id,
        token_hash: tokenHash,
        expires_at: expiresAt,
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: rawToken });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Email verified successfully.');

    const updated = await prisma.account.findUnique({ where: { id: account.id } });
    expect(updated?.isVerified).toBe(true);
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/verify-email')
      .send({ token: 'completely-invalid-token' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/forgot-password
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/forgot-password', () => {
  it('returns 202 when account exists', async () => {
    await prisma.account.create({
      data: {
        email: 'forgot@example.com',
        passwordHash: 'irrelevant',
        isVerified: true,
        profile: { create: { fullName: 'Forgot User' } },
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'forgot@example.com' });

    expect(res.status).toBe(202);
  });

  it('returns 202 even when account does not exist (anti-enumeration)', async () => {
    const res = await request(app)
      .post('/api/v1/auth/forgot-password')
      .send({ email: 'nobody@example.com' });

    expect(res.status).toBe(202);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /auth/reset-password
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/auth/reset-password', () => {
  it('returns 200 and updates the password', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'reset@example.com',
        passwordHash: 'old-hash',
        isVerified: true,
        profile: { create: { fullName: 'Reset User' } },
      },
    });

    const rawToken = 'test-reset-token-xyz789';
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Password updated successfully.');
  });

  it('returns 400 for an invalid token', async () => {
    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: 'bad-token', password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('INVALID_TOKEN');
  });

  it('returns 400 for an already used token', async () => {
    const account = await prisma.account.create({
      data: {
        email: 'usedtoken@example.com',
        passwordHash: 'hash',
        isVerified: true,
        profile: { create: { fullName: 'Used Token User' } },
      },
    });

    const rawToken = 'used-reset-token-123';
    const tokenHash = hashToken(rawToken);

    await prisma.passwordResetToken.create({
      data: {
        accountId: account.id,
        tokenHash,
        expiresAt: new Date(Date.now() + 3600000),
        usedAt: new Date(), // already used
      },
    });

    const res = await request(app)
      .post('/api/v1/auth/reset-password')
      .send({ token: rawToken, password: 'newpassword123' });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('TOKEN_ALREADY_USED');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /auth/sessions
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/auth/sessions', () => {
  it('returns 200 with session list for authenticated user', async () => {
    const { accessToken } = await registerAndLogin('sessions@example.com');

    const res = await request(app)
      .get('/api/v1/auth/sessions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/v1/auth/sessions');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /auth/sessions/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/v1/auth/sessions/:id', () => {
  it('returns 204 when deleting own session', async () => {
    const { accessToken, account } = await registerAndLogin('delsession@example.com');

    const sessions = await prisma.session.findMany({
      where: { accountId: account.id },
    });
    const sessionId = sessions[0]!.id;

    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${sessionId}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 403 when trying to delete another account session', async () => {
    const { accessToken } = await registerAndLogin('owner@example.com');
    const { account: otherAccount } = await registerAndLogin('other@example.com');

    const otherSession = await prisma.session.findFirst({
      where: { accountId: otherAccount.id },
    });

    const res = await request(app)
      .delete(`/api/v1/auth/sessions/${otherSession!.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});