import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import app from '../../../app';
import { PrismaClient } from '../../../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function registerAndLogin(
  email = 'test@example.com',
  password = 'password123',
  fullName = 'Test User'
) {
  const passwordHash = await bcrypt.hash(password, 10);

  const account = await prisma.account.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      isVerified: true,
      profile: { create: { fullName } },
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
    accessToken: res.body.access_token as string,
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /users/me
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/users/me', () => {
  it('returns 200 with correct profile shape', async () => {
    const { accessToken } = await registerAndLogin('me@example.com');

    const res = await request(app)
      .get('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      email: 'me@example.com',
      is_verified: true,
      is_active: true,
      full_name: 'Test User',
    });
    expect(res.body.id).toBeDefined();
    expect(res.body.roles).toHaveLength(1);
    expect(res.body.roles[0].name).toBe('employee');
  });

  it('returns 401 if no token is provided', async () => {
    const res = await request(app).get('/api/v1/users/me');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /users/me
// ═════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/users/me', () => {
  it('returns 200 with updated profile', async () => {
    const { accessToken } = await registerAndLogin('patch@example.com');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Updated Name', department: 'Engineering' });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Updated Name');
    expect(res.body.department).toBe('Engineering');
  });

  it('returns 200 with partial update — only provided fields change', async () => {
    const { accessToken } = await registerAndLogin('partial@example.com');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ department: 'Design' });

    expect(res.status).toBe(200);
    expect(res.body.department).toBe('Design');
    expect(res.body.full_name).toBe('Test User'); // unchanged
  });

  it('returns 422 if a field is the wrong type', async () => {
    const { accessToken } = await registerAndLogin('wrongtype@example.com');

    const res = await request(app)
      .patch('/api/v1/users/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 123 });

    expect(res.status).toBe(422);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
  });

  it('returns 401 if no token is provided', async () => {
    const res = await request(app)
      .patch('/api/v1/users/me')
      .send({ full_name: 'No Auth' });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /users/me/avatar
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/users/me/avatar', () => {
  it('returns 501 Not Implemented', async () => {
    const { accessToken } = await registerAndLogin('avatar@example.com');

    const res = await request(app)
      .post('/api/v1/users/me/avatar')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(501);
    expect(res.body.error.code).toBe('NOT_IMPLEMENTED');
  });

  it('returns 401 if no token is provided', async () => {
    const res = await request(app).post('/api/v1/users/me/avatar');
    expect(res.status).toBe(401);
  });
});