import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// ─── ADD THESE MOCKS ──────────────────────────────────────────────────────────

jest.mock('express-rate-limit', () => {
  return () => (req: any, res: any, next: any) => next();
});

jest.mock('../../analytics/analytics.jobs', () => ({
  startAnalyticsJobs: jest.fn(),
}));

// Use requireActual to keep the rest of the service intact!
jest.mock('../audit.service', () => {
  const originalModule = jest.requireActual('../audit.service');
  return {
    __esModule: true,
    ...originalModule,
    createAuditEvent: jest.fn().mockResolvedValue(undefined),
  };
})

import app from '../../../app';
import { PrismaClient } from '../../../generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────
async function createAndLoginUser(
  email: string,
  roleName: 'admin' | 'manager' | 'employee' = 'employee'
) {
  const passwordHash = await bcrypt.hash('password123', 10);

  await prisma.account.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      isVerified: true,
      profile: { create: { fullName: 'Test User' } },
      accountRoles: {
        create: {
          role: { connect: { name: roleName } },
        },
      },
    },
  });

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });

  // Add this safety check!
  if (res.status !== 200) {
    throw new Error(`Auth setup failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }

  return res.body.access_token as string;
}

async function seedAuditEvent(overrides: Partial<{
  actorId: string;
  actorEmail: string;
  action: string;
  module: string;
  targetType: string;
  targetId: string;
  payload: object;
}> = {}) {
  return prisma.auditEvent.create({
    data: {
      action: overrides.action ?? 'auth.account.login',
      module: overrides.module ?? 'auth',
      ...(overrides.actorId !== undefined && { actorId: overrides.actorId }),
      ...(overrides.actorEmail !== undefined && { actorEmail: overrides.actorEmail }),
      ...(overrides.targetType !== undefined && { targetType: overrides.targetType }),
      ...(overrides.targetId !== undefined && { targetId: overrides.targetId }),
      ...(overrides.payload !== undefined && { payload: overrides.payload as object }),
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────
describe('Audit Module', () => {
  describe('GET /api/v1/audit/events', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/audit/events');
      expect(res.status).toBe(401);
    });

    it('should return 403 if authenticated as non-admin', async () => {
      const token = await createAndLoginUser('employee@test.com', 'employee');

      const res = await request(app)
        .get('/api/v1/audit/events')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 403 if authenticated as manager', async () => {
      const token = await createAndLoginUser('manager@test.com', 'manager');

      const res = await request(app)
        .get('/api/v1/audit/events')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return paginated audit events for admin', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedAuditEvent({ action: 'auth.account.login', module: 'auth' });
      await seedAuditEvent({ action: 'inventory.item.created', module: 'inventory' });

      const res = await request(app)
        .get('/api/v1/audit/events')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.meta).toBeDefined();
      expect(res.body.meta.page).toBe(1);
      expect(res.body.meta.per_page).toBe(20);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(2);
    });

    it('should filter by module', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedAuditEvent({ action: 'auth.account.login', module: 'auth' });
      await seedAuditEvent({ action: 'inventory.item.created', module: 'inventory' });

      const res = await request(app)
        .get('/api/v1/audit/events?module=inventory')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((e: { module: string }) => e.module === 'inventory')).toBe(true);
    });

    it('should filter by action', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedAuditEvent({ action: 'auth.account.login', module: 'auth' });
      await seedAuditEvent({ action: 'auth.account.registered', module: 'auth' });

      const res = await request(app)
        .get('/api/v1/audit/events?action=auth.account.login')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((e: { action: string }) => e.action === 'auth.account.login')
      ).toBe(true);
    });

    it('should filter by actor_id', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const actorId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      await seedAuditEvent({ actorId, module: 'auth', action: 'auth.account.login' });
      await seedAuditEvent({ module: 'inventory', action: 'inventory.item.created' });

      const res = await request(app)
        .get(`/api/v1/audit/events?actor_id=${actorId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data.every((e: { actor_id: string }) => e.actor_id === actorId)).toBe(true);
    });

    it('should filter by target_type', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedAuditEvent({ targetType: 'item', action: 'inventory.item.created', module: 'inventory' });
      await seedAuditEvent({ targetType: 'account', action: 'auth.account.login', module: 'auth' });

      const res = await request(app)
        .get('/api/v1/audit/events?target_type=item')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(
        res.body.data.every((e: { target_type: string }) => e.target_type === 'item')
      ).toBe(true);
    });

    it('should respect pagination', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          seedAuditEvent({ action: 'auth.account.login', module: 'auth', actorEmail: `user${i}@test.com` })
        )
      );

      const res = await request(app)
        .get('/api/v1/audit/events?page=1&per_page=3')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(3);
      expect(res.body.meta.per_page).toBe(3);
    });

    it('should filter by from and to date range', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedAuditEvent({ action: 'auth.account.login', module: 'auth' });

      const from = new Date(Date.now() - 60000).toISOString();
      const to = new Date(Date.now() + 60000).toISOString();

      const res = await request(app)
        .get(`/api/v1/audit/events?from=${from}&to=${to}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(1);
    });
  });

  describe('GET /api/v1/audit/events/:id', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/audit/events/some-id');
      expect(res.status).toBe(401);
    });

    it('should return 403 if authenticated as non-admin', async () => {
      const token = await createAndLoginUser('employee@test.com', 'employee');
      const event = await seedAuditEvent();

      const res = await request(app)
        .get(`/api/v1/audit/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 404 for non-existent event', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');

      const res = await request(app)
        .get('/api/v1/audit/events/a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(404);
    });

    it('should return a single audit event by id for admin', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const event = await seedAuditEvent({
        action: 'inventory.item.created',
        module: 'inventory',
        targetType: 'item',
        actorEmail: 'someone@test.com',
      });

      const res = await request(app)
        .get(`/api/v1/audit/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.id).toBe(event.id);
      expect(res.body.action).toBe('inventory.item.created');
      expect(res.body.module).toBe('inventory');
      expect(res.body.target_type).toBe('item');
      expect(res.body.actor_email).toBe('someone@test.com');
    });

    it('should return correct shape with nullable fields', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const event = await seedAuditEvent();

      const res = await request(app)
        .get(`/api/v1/audit/events/${event.id}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('id');
      expect(res.body).toHaveProperty('actor_id');
      expect(res.body).toHaveProperty('actor_email');
      expect(res.body).toHaveProperty('action');
      expect(res.body).toHaveProperty('module');
      expect(res.body).toHaveProperty('target_type');
      expect(res.body).toHaveProperty('target_id');
      expect(res.body).toHaveProperty('payload');
      expect(res.body).toHaveProperty('ip_address');
      expect(res.body).toHaveProperty('user_agent');
      expect(res.body).toHaveProperty('created_at');
    });
  });
});