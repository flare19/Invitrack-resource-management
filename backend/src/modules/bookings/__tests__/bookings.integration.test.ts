import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

// ─── ADD THESE MOCKS ──────────────────────────────────────────────────────────

// 1. Mock express-rate-limit to pass-through
jest.mock('express-rate-limit', () => {
  return () => (req: any, res: any, next: any) => next();
});

// 2. Mock background analytics jobs to prevent Jest "Open Handle" hangs
jest.mock('../../analytics/analytics.jobs', () => ({
  startAnalyticsJobs: jest.fn(),
}));

// 3. Mock audit service to prevent async hanging
jest.mock('../../audit/audit.service', () => ({
  createAuditEvent: jest.fn().mockResolvedValue(undefined),
}));

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

async function createAndLoginWithPermission(
  email: string,
  roleName: 'admin' | 'manager' | 'employee' = 'employee',
  permissionCode?: string
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

  if (permissionCode) {
    const permission = await prisma.permission.upsert({
      where: { code: permissionCode },
      create: { code: permissionCode, description: permissionCode },
      update: {},
    });

    const role = await prisma.role.findUnique({ where: { name: roleName } });

    if (role) {
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: permission.id } },
        create: { roleId: role.id, permissionId: permission.id },
        update: {},
      });
    }
  }

  const res = await request(app)
    .post('/api/v1/auth/login')
    .send({ email, password: 'password123' });

  // Add this safety check!
  if (res.status !== 200) {
    throw new Error(`Auth setup failed with status ${res.status}: ${JSON.stringify(res.body)}`);
  }
  return res.body.access_token as string;
}

// ─── Bookings-specific seeders ────────────────────────────────────────────────
async function seedBookableItem(createdBy: string) {
  return prisma.item.create({
    data: {
      sku: `ITEM-${Date.now()}`,
      name: 'Projector',
      unit: 'pcs',
      reorderThreshold: 0,
      isBookable: true,
      createdBy,
    },
  });
}

async function seedResource(itemId: string, overrides: Record<string, unknown> = {}) {
  return prisma.resource.create({
    data: {
      itemId,
      name: 'Conference Projector A',
      quantity: 2,
      ...overrides,
    },
  });
}

async function seedReservation(
  resourceId: string,
  requestedBy: string,
  overrides: Record<string, unknown> = {}
) {
  return prisma.reservation.create({
    data: {
      resourceId,
      requestedBy,
      quantity: 1,
      startTime: new Date('2027-03-07T09:00:00Z'),
      endTime: new Date('2027-03-07T11:00:00Z'),
      status: 'pending',
      priority: 10,
      ...overrides,
    },
  });
}

// ─── Shared admin account for seeding ────────────────────────────────────────
async function seedAdminAccount() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const account = await prisma.account.create({
    data: {
      email: `seed-admin-${Date.now()}@example.com`,
      passwordHash,
      isVerified: true,
      profile: { create: { fullName: 'Seed Admin' } },
      accountRoles: {
        create: { role: { connect: { name: 'admin' } } },
      },
    },
  });
  return account.id;
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /bookings/resources
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/bookings/resources', () => {
  it('returns 200 with paginated resources', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    await seedResource(item.id);

    const token = await createAndLoginUser('res-list@example.com');

    const res = await request(app)
      .get('/api/v1/bookings/resources')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.total).toBe(1);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/bookings/resources');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /bookings/resources/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/bookings/resources/:id', () => {
  it('returns 200 with resource', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('res-get@example.com');

    const res = await request(app)
      .get(`/api/v1/bookings/resources/${resource.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(resource.id);
    expect(res.body.name).toBe('Conference Projector A');
  });

  it('returns 404 for unknown resource', async () => {
    const token = await createAndLoginUser('res-get-404@example.com');

    const res = await request(app)
      .get('/api/v1/bookings/resources/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app)
      .get('/api/v1/bookings/resources/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /bookings/resources
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/bookings/resources', () => {
  it('returns 201 with created resource', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);

    const token = await createAndLoginWithPermission(
      'res-create@example.com',
      'manager',
      'bookings:write'
    );

    const res = await request(app)
      .post('/api/v1/bookings/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({ item_id: item.id, name: 'Projector A', quantity: 2 });

    expect(res.status).toBe(201);
    expect(res.body.item_id).toBe(item.id);
    expect(res.body.quantity).toBe(2);
  });

  it('returns 403 if no bookings:write permission', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);

    const token = await createAndLoginUser('res-create-403@example.com', 'employee');

    const res = await request(app)
      .post('/api/v1/bookings/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({ item_id: item.id, name: 'Projector A', quantity: 2 });

    expect(res.status).toBe(403);
  });

  it('returns 400 if item is not bookable', async () => {
    const adminId = await seedAdminAccount();
    const item = await prisma.item.create({
      data: {
        sku: `ITEM-${Date.now()}`,
        name: 'Non-bookable item',
        unit: 'pcs',
        reorderThreshold: 0,
        isBookable: false,
        createdBy: adminId,
      },
    });

    const token = await createAndLoginWithPermission(
      'res-create-400@example.com',
      'manager',
      'bookings:write'
    );

    const res = await request(app)
      .post('/api/v1/bookings/resources')
      .set('Authorization', `Bearer ${token}`)
      .send({ item_id: item.id, name: 'Projector A', quantity: 2 });

    expect(res.status).toBe(400);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app)
      .post('/api/v1/bookings/resources')
      .send({ item_id: 'x', name: 'x', quantity: 1 });
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /bookings/resources/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/bookings/resources/:id', () => {
  it('returns 200 with updated resource', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginWithPermission(
      'res-update@example.com',
      'manager',
      'bookings:write'
    );

    const res = await request(app)
      .patch(`/api/v1/bookings/resources/${resource.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Projector' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Projector');
  });

  it('returns 403 if no bookings:write permission', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('res-update-403@example.com', 'employee');

    const res = await request(app)
      .patch(`/api/v1/bookings/resources/${resource.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Updated Projector' });

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /bookings/resources/:id/availability
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/bookings/resources/:id/availability', () => {
  it('returns 200 with full availability when no reservations', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('avail-full@example.com');

    const res = await request(app)
      .get(`/api/v1/bookings/resources/${resource.id}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .query({
        start_time: '2027-03-07T09:00:00Z',
        end_time: '2027-03-07T11:00:00Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.total_quantity).toBe(2);
    expect(res.body.reserved_quantity).toBe(0);
    expect(res.body.available_quantity).toBe(2);
  });

  it('returns reduced availability when reservation exists', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    await seedReservation(resource.id, adminId);

    const token = await createAndLoginUser('avail-partial@example.com');

    const res = await request(app)
      .get(`/api/v1/bookings/resources/${resource.id}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .query({
        start_time: '2027-03-07T08:00:00Z',
        end_time: '2027-03-07T10:00:00Z',
      });

    expect(res.status).toBe(200);
    expect(res.body.reserved_quantity).toBe(1);
    expect(res.body.available_quantity).toBe(1);
  });

  it('returns 400 if start_time missing', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('avail-400@example.com');

    const res = await request(app)
      .get(`/api/v1/bookings/resources/${resource.id}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .query({ end_time: '2027-03-07T11:00:00Z' });

    expect(res.status).toBe(400);
  });

  it('returns 400 if end_time is before start_time', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('avail-400b@example.com');

    const res = await request(app)
      .get(`/api/v1/bookings/resources/${resource.id}/availability`)
      .set('Authorization', `Bearer ${token}`)
      .query({
        start_time: '2027-03-07T11:00:00Z',
        end_time: '2027-03-07T09:00:00Z',
      });

    expect(res.status).toBe(400);
  });

  it('returns 404 for unknown resource', async () => {
    const token = await createAndLoginUser('avail-404@example.com');

    const res = await request(app)
      .get('/api/v1/bookings/resources/00000000-0000-0000-0000-000000000000/availability')
      .set('Authorization', `Bearer ${token}`)
      .query({
        start_time: '2027-03-07T09:00:00Z',
        end_time: '2027-03-07T11:00:00Z',
      });

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /bookings/reservations
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/bookings/reservations', () => {
  it('returns 201 with created reservation', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-create@example.com');

    const res = await request(app)
      .post('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resource_id: resource.id,
        quantity: 1,
        start_time: '2027-03-07T09:00:00Z',
        end_time: '2027-03-07T11:00:00Z',
      });

    expect(res.status).toBe(201);
    expect(res.body.resource_id).toBe(resource.id);
    expect(res.body.status).toBe('pending');
    expect(res.body.quantity).toBe(1);
  });

  it('returns 409 if quantity unavailable', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id, { quantity: 1 });
    await seedReservation(resource.id, adminId);

    const token = await createAndLoginUser('rsv-conflict@example.com');

    const res = await request(app)
      .post('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resource_id: resource.id,
        quantity: 1,
        start_time: '2027-03-07T08:00:00Z',
        end_time: '2027-03-07T10:00:00Z',
      });

    expect(res.status).toBe(409);
  });

  it('returns 400 if end_time is before start_time', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-400@example.com');

    const res = await request(app)
      .post('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({
        resource_id: resource.id,
        quantity: 1,
        start_time: '2027-03-07T11:00:00Z',
        end_time: '2027-03-07T09:00:00Z',
      });

    expect(res.status).toBe(400);
  });

  it('returns 400 if required fields missing', async () => {
    const token = await createAndLoginUser('rsv-missing@example.com');

    const res = await request(app)
      .post('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 1 });

    expect(res.status).toBe(400);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app)
      .post('/api/v1/bookings/reservations')
      .send({});
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /bookings/reservations
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/bookings/reservations', () => {
  it('returns only own reservations for employee', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-list-emp@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-list-emp@example.com' },
    });

    await seedReservation(resource.id, account.id);
    await seedReservation(resource.id, adminId);

    const res = await request(app)
      .get('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0].requested_by).toBe(account.id);
  });

  it('returns all reservations for user with bookings:write', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginWithPermission(
      'rsv-list-mgr@example.com',
      'manager',
      'bookings:write'
    );
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-list-mgr@example.com' },
    });

    await seedReservation(resource.id, account.id);
    await seedReservation(resource.id, adminId);

    const res = await request(app)
      .get('/api/v1/bookings/reservations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/bookings/reservations');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /bookings/reservations/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/bookings/reservations/:id', () => {
  it('returns 200 for owner', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-get@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-get@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id);

    const res = await request(app)
      .get(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(reservation.id);
  });

  it('returns 403 if not owner and no bookings:write', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginUser('rsv-get-403@example.com', 'employee');

    const res = await request(app)
      .get(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });

  it('returns 200 for user with bookings:write on any reservation', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginWithPermission(
      'rsv-get-mgr@example.com',
      'manager',
      'bookings:write'
    );

    const res = await request(app)
      .get(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
  });

  it('returns 404 for unknown reservation', async () => {
    const token = await createAndLoginUser('rsv-get-404@example.com');

    const res = await request(app)
      .get('/api/v1/bookings/reservations/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /bookings/reservations/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/bookings/reservations/:id', () => {
  it('returns 200 when owner updates notes', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-patch@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-patch@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id);

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'Updated note' });

    expect(res.status).toBe(200);
    expect(res.body.notes).toBe('Updated note');
  });

  it('returns 200 when owner cancels own reservation', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-cancel@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-cancel@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id);

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'cancelled' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('cancelled');
  });

  it('returns 403 if employee tries to update quantity', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-patch-403@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-patch-403@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id);

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(403);
  });

  it('returns 200 when bookings:write user updates quantity', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const token = await createAndLoginWithPermission(
      'rsv-patch-mgr@example.com',
      'manager',
      'bookings:write'
    );
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-patch-mgr@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id);

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ quantity: 2 });

    expect(res.status).toBe(200);
    expect(res.body.quantity).toBe(2);
  });

  it('returns 409 if reservation is not pending', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);

    const token = await createAndLoginUser('rsv-patch-409@example.com');
    const account = await prisma.account.findUniqueOrThrow({
      where: { email: 'rsv-patch-409@example.com' },
    });
    const reservation = await seedReservation(resource.id, account.id, {
      status: 'approved',
    });

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'test' });

    expect(res.status).toBe(409);
  });

  it('returns 403 if not owner and no bookings:write', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginUser('rsv-patch-own@example.com', 'employee');

    const res = await request(app)
      .patch(`/api/v1/bookings/reservations/${reservation.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ notes: 'test' });

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /bookings/reservations/:id/review
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/bookings/reservations/:id/review', () => {
  it('returns 200 when approving a pending reservation', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginWithPermission(
      'rsv-approve@example.com',
      'manager',
      'bookings:approve'
    );

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
    expect(res.body.reviewed_by).toBeDefined();
  });

  it('returns 200 when rejecting a pending reservation', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginWithPermission(
      'rsv-reject@example.com',
      'manager',
      'bookings:approve'
    );

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'reject' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('returns 409 if reservation is not pending', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId, {
      status: 'approved',
    });

    const token = await createAndLoginWithPermission(
      'rsv-review-409@example.com',
      'manager',
      'bookings:approve'
    );

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(409);
  });

  it('returns 409 if approving but quantity no longer available', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id, { quantity: 1 });

    const reservation = await seedReservation(resource.id, adminId);
    await seedReservation(resource.id, adminId, { status: 'approved' });

    const token = await createAndLoginWithPermission(
      'rsv-approve-409@example.com',
      'manager',
      'bookings:approve'
    );

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(409);
  });

  it('returns 403 if no bookings:approve permission', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginUser('rsv-review-403@example.com', 'employee');

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'approve' });

    expect(res.status).toBe(403);
  });

  it('returns 400 if action is invalid', async () => {
    const adminId = await seedAdminAccount();
    const item = await seedBookableItem(adminId);
    const resource = await seedResource(item.id);
    const reservation = await seedReservation(resource.id, adminId);

    const token = await createAndLoginWithPermission(
      'rsv-review-400@example.com',
      'manager',
      'bookings:approve'
    );

    const res = await request(app)
      .post(`/api/v1/bookings/reservations/${reservation.id}/review`)
      .set('Authorization', `Bearer ${token}`)
      .send({ action: 'invalid' });

    expect(res.status).toBe(400);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app)
      .post('/api/v1/bookings/reservations/00000000-0000-0000-0000-000000000000/review')
      .send({ action: 'approve' });
    expect(res.status).toBe(401);
  });
});