import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

import app from '../../../app';
import { PrismaClient } from '../../../generated/prisma';
import bcrypt from 'bcrypt';
import { runInventorySnapshotJob, runBookingMetricsJob } from '../analytics.service';

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

  return res.body.access_token as string;
}

async function seedInventorySnapshot(overrides: Partial<{
  snapshotDate: Date;
  itemId: string;
  locationId: string;
  quantity: number;
}> = {}) {
  return prisma.dailyInventorySnapshot.create({
    data: {
      snapshotDate: overrides.snapshotDate ?? new Date('2026-04-03'),
      itemId: overrides.itemId ?? 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      locationId: overrides.locationId ?? 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      quantity: overrides.quantity ?? 10,
    },
  });
}

async function seedBookingMetric(overrides: Partial<{
  metricDate: Date;
  resourceId: string;
  totalRequests: number;
  approvedCount: number;
  rejectedCount: number;
  utilizationMinutes: number;
}> = {}) {
  return prisma.bookingMetric.create({
    data: {
      metricDate: overrides.metricDate ?? new Date('2026-04-03'),
      resourceId: overrides.resourceId ?? 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      totalRequests: overrides.totalRequests ?? 5,
      approvedCount: overrides.approvedCount ?? 3,
      rejectedCount: overrides.rejectedCount ?? 1,
      utilizationMinutes: overrides.utilizationMinutes ?? 120,
    },
  });
}

async function seedBookableItem(createdBy: string) {
  return prisma.item.create({
    data: {
      sku: `ITEM-${Date.now()}`,
      name: 'Test Item',
      unit: 'pcs',
      reorderThreshold: 0,
      isBookable: true,
      createdBy,
    },
  });
}

async function seedLocation() {
  return prisma.location.create({
    data: { name: `Location-${Date.now()}` },
  });
}

async function seedStockLevel(itemId: string, locationId: string, quantity: number) {
  return prisma.stockLevel.create({
    data: { itemId, locationId, quantity },
  });
}

async function seedResource(itemId: string) {
  return prisma.resource.create({
    data: {
      itemId,
      name: `Resource-${Date.now()}`,
      quantity: 5,
    },
  });
}

async function seedReservation(
  resourceId: string,
  requestedBy: string,
  status: string,
  startTime: Date,
  endTime: Date
) {
  return prisma.reservation.create({
    data: {
      resourceId,
      requestedBy,
      quantity: 1,
      status,
      priority: 10,
      startTime,
      endTime,
    },
  });
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('Analytics Module', () => {

  // ─── Inventory Snapshot Job ────────────────────────────────────────────────

  describe('runInventorySnapshotJob', () => {
    it('should upsert snapshot rows for all stock levels', async () => {
      const adminToken = await createAndLoginUser('admin@test.com', 'admin');

      const account = await prisma.account.findUnique({
        where: { email: 'admin@test.com' },
      });

      const item = await seedBookableItem(account!.id);
      const location = await seedLocation();
      await seedStockLevel(item.id, location.id, 15);

      const date = new Date('2026-04-03');
      await runInventorySnapshotJob(date);

      const snapshot = await prisma.dailyInventorySnapshot.findUnique({
        where: {
          snapshotDate_itemId_locationId: {
            snapshotDate: date,
            itemId: item.id,
            locationId: location.id,
          },
        },
      });

      expect(snapshot).not.toBeNull();
      expect(snapshot!.quantity).toBe(15);
    });

    it('should be idempotent — re-running for the same date upserts not duplicates', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'admin2@test.com',
          passwordHash: await bcrypt.hash('password123', 10),
          isVerified: true,
          profile: { create: { fullName: 'Test User' } },
          accountRoles: { create: { role: { connect: { name: 'admin' } } } },
        },
      });

      const item = await seedBookableItem(account.id);
      const location = await seedLocation();
      await seedStockLevel(item.id, location.id, 10);

      const date = new Date('2026-04-03');
      await runInventorySnapshotJob(date);
      await runInventorySnapshotJob(date);

      const snapshots = await prisma.dailyInventorySnapshot.findMany({
        where: { itemId: item.id, locationId: location.id, snapshotDate: date },
      });

      expect(snapshots).toHaveLength(1);
    });

    it('should skip gracefully when no stock levels exist', async () => {
      const date = new Date('2026-04-03');
      await expect(runInventorySnapshotJob(date)).resolves.not.toThrow();
    });
  });

  // ─── Booking Metrics Job ───────────────────────────────────────────────────

  describe('runBookingMetricsJob', () => {
    it('should aggregate reservation counts and utilization correctly', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'admin3@test.com',
          passwordHash: await bcrypt.hash('password123', 10),
          isVerified: true,
          profile: { create: { fullName: 'Test User' } },
          accountRoles: { create: { role: { connect: { name: 'admin' } } } },
        },
      });

      const item = await seedBookableItem(account.id);
      const resource = await seedResource(item.id);

      const date = new Date('2026-04-03');
      const start = new Date('2026-04-03T09:00:00Z');
      const end = new Date('2026-04-03T11:00:00Z'); // 120 minutes

      await seedReservation(resource.id, account.id, 'approved', start, end);
      await seedReservation(resource.id, account.id, 'rejected', start, end);
      await seedReservation(resource.id, account.id, 'pending', start, end);

      await runBookingMetricsJob(date);

      const metric = await prisma.bookingMetric.findUnique({
        where: {
          metricDate_resourceId: {
            metricDate: date,
            resourceId: resource.id,
          },
        },
      });

      expect(metric).not.toBeNull();
      expect(metric!.totalRequests).toBe(3);
      expect(metric!.approvedCount).toBe(1);
      expect(metric!.rejectedCount).toBe(1);
      expect(metric!.utilizationMinutes).toBe(120);
    });

    it('should be idempotent — re-running for the same date upserts not duplicates', async () => {
      const account = await prisma.account.create({
        data: {
          email: 'admin4@test.com',
          passwordHash: await bcrypt.hash('password123', 10),
          isVerified: true,
          profile: { create: { fullName: 'Test User' } },
          accountRoles: { create: { role: { connect: { name: 'admin' } } } },
        },
      });

      const item = await seedBookableItem(account.id);
      const resource = await seedResource(item.id);

      const date = new Date('2026-04-03');
      const start = new Date('2026-04-03T09:00:00Z');
      const end = new Date('2026-04-03T10:00:00Z');

      await seedReservation(resource.id, account.id, 'approved', start, end);

      await runBookingMetricsJob(date);
      await runBookingMetricsJob(date);

      const metrics = await prisma.bookingMetric.findMany({
        where: { resourceId: resource.id, metricDate: date },
      });

      expect(metrics).toHaveLength(1);
    });

    it('should skip gracefully when no reservations exist for the date', async () => {
      const date = new Date('2026-04-03');
      await expect(runBookingMetricsJob(date)).resolves.not.toThrow();
    });
  });

  // ─── GET /api/v1/analytics/inventory/snapshots ────────────────────────────

  describe('GET /api/v1/analytics/inventory/snapshots', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app)
        .get('/api/v1/analytics/inventory/snapshots?item_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(res.status).toBe(401);
    });

    it('should return 403 if authenticated as employee', async () => {
      const token = await createAndLoginUser('employee@test.com', 'employee');

      const res = await request(app)
        .get('/api/v1/analytics/inventory/snapshots?item_id=a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return 400 if item_id is missing', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');

      const res = await request(app)
        .get('/api/v1/analytics/inventory/snapshots')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(400);
    });

    it('should return snapshots for admin', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const itemId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      await seedInventorySnapshot({ itemId, quantity: 8 });

      const res = await request(app)
        .get(`/api/v1/analytics/inventory/snapshots?item_id=${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].item_id).toBe(itemId);
      expect(res.body[0].quantity).toBe(8);
      expect(res.body[0].snapshot_date).toBe('2026-04-03');
    });

    it('should return snapshots for manager', async () => {
      const token = await createAndLoginUser('manager@test.com', 'manager');
      const itemId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      await seedInventorySnapshot({ itemId });

      const res = await request(app)
        .get(`/api/v1/analytics/inventory/snapshots?item_id=${itemId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by location_id', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const itemId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const locationId = 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const otherLocationId = 'd0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      await seedInventorySnapshot({ itemId, locationId, quantity: 5 });
      await seedInventorySnapshot({
        itemId,
        locationId: otherLocationId,
        snapshotDate: new Date('2026-04-02'),
        quantity: 3,
      });

      const res = await request(app)
        .get(`/api/v1/analytics/inventory/snapshots?item_id=${itemId}&location_id=${locationId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((s: { location_id: string }) => s.location_id === locationId)).toBe(true);
    });

    it('should filter by from and to date range', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const itemId = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      await seedInventorySnapshot({ itemId, snapshotDate: new Date('2026-04-01'), quantity: 5 });
      await seedInventorySnapshot({ itemId, snapshotDate: new Date('2026-04-02'), locationId: 'b0eebc99-9c0b-4ef8-bb6d-6bb9bd380b22', quantity: 8 });

      const res = await request(app)
        .get(`/api/v1/analytics/inventory/snapshots?item_id=${itemId}&from=2026-04-02&to=2026-04-02`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((s: { snapshot_date: string }) => s.snapshot_date >= '2026-04-02')).toBe(true);
    });
  });

  // ─── GET /api/v1/analytics/bookings/metrics ───────────────────────────────

  describe('GET /api/v1/analytics/bookings/metrics', () => {
    it('should return 401 if not authenticated', async () => {
      const res = await request(app).get('/api/v1/analytics/bookings/metrics');
      expect(res.status).toBe(401);
    });

    it('should return 403 if authenticated as employee', async () => {
      const token = await createAndLoginUser('employee@test.com', 'employee');

      const res = await request(app)
        .get('/api/v1/analytics/bookings/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(403);
    });

    it('should return all metrics for admin with no filters', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedBookingMetric();

      const res = await request(app)
        .get('/api/v1/analytics/bookings/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
    });

    it('should return metrics for manager', async () => {
      const token = await createAndLoginUser('manager@test.com', 'manager');
      await seedBookingMetric();

      const res = await request(app)
        .get('/api/v1/analytics/bookings/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
    });

    it('should filter by resource_id', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      const resourceId = 'c0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';
      const otherResourceId = 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

      await seedBookingMetric({ resourceId });
      await seedBookingMetric({
        resourceId: otherResourceId,
        metricDate: new Date('2026-04-02'),
      });

      const res = await request(app)
        .get(`/api/v1/analytics/bookings/metrics?resource_id=${resourceId}`)
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((m: { resource_id: string }) => m.resource_id === resourceId)).toBe(true);
    });

    it('should filter by from and to date range', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');

      await seedBookingMetric({ metricDate: new Date('2026-04-01') });
      await seedBookingMetric({
        metricDate: new Date('2026-04-02'),
        resourceId: 'e0eebc99-9c0b-4ef8-bb6d-6bb9bd380a22',
      });

      const res = await request(app)
        .get('/api/v1/analytics/bookings/metrics?from=2026-04-02&to=2026-04-02')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.every((m: { metric_date: string }) => m.metric_date >= '2026-04-02')).toBe(true);
    });

    it('should return correct shape', async () => {
      const token = await createAndLoginUser('admin@test.com', 'admin');
      await seedBookingMetric();

      const res = await request(app)
        .get('/api/v1/analytics/bookings/metrics')
        .set('Authorization', `Bearer ${token}`);

      expect(res.status).toBe(200);
      const metric = res.body[0];
      expect(metric).toHaveProperty('metric_date');
      expect(metric).toHaveProperty('resource_id');
      expect(metric).toHaveProperty('total_requests');
      expect(metric).toHaveProperty('approved_count');
      expect(metric).toHaveProperty('rejected_count');
      expect(metric).toHaveProperty('utilization_minutes');
      expect(metric).toHaveProperty('created_at');
    });
  });
});