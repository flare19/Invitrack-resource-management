import request from 'supertest';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.test' });

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

  return res.body.access_token as string;
}

async function seedCategory(name = 'Electronics', parentId?: string) {
  return prisma.category.create({
    data: { name, ...(parentId && { parentId }) },
  });
}

async function seedLocation(name = 'Warehouse A', description?: string) {
  return prisma.location.create({
    data: { name, ...(description && { description }) },
  });
}

async function seedItem(createdBy: string, overrides: Record<string, unknown> = {}) {
  return prisma.item.create({
    data: {
      sku: `ITEM-${Date.now()}`,
      name: 'Projector',
      unit: 'pcs',
      reorderThreshold: 2,
      isBookable: false,
      createdBy,
      ...overrides,
    },
  });
}

async function seedStockLevel(itemId: string, locationId: string, quantity: number) {
  return prisma.stockLevel.create({
    data: { itemId, locationId, quantity },
  });
}

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/categories
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/categories', () => {
  it('returns 200 with all categories', async () => {
    const token = await createAndLoginUser('cat-list@example.com');
    await seedCategory('Electronics');

    const res = await request(app)
      .get('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0]).toMatchObject({ name: 'Electronics', parent_id: null });
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/inventory/categories');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /inventory/categories
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/inventory/categories', () => {
  it('returns 201 with created category', async () => {
    const token = await createAndLoginWithPermission(
      'cat-create@example.com',
      'employee',
      'inventory:write'
    );

    const res = await request(app)
      .post('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Electronics');
    expect(res.body.parent_id).toBeNull();
  });

  it('returns 201 with child category', async () => {
    const token = await createAndLoginWithPermission(
      'cat-child@example.com',
      'employee',
      'inventory:write'
    );
    const parent = await seedCategory('Electronics');

    const res = await request(app)
      .post('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'AV Equipment', parent_id: parent.id });

    expect(res.status).toBe(201);
    expect(res.body.parent_id).toBe(parent.id);
  });

  it('returns 403 if no inventory:write permission', async () => {
    const token = await createAndLoginUser('cat-noperm@example.com', 'employee');

    const res = await request(app)
      .post('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Electronics' });

    expect(res.status).toBe(403);
  });

  it('returns 422 if name is missing', async () => {
    const token = await createAndLoginWithPermission(
      'cat-422@example.com',
      'employee',
      'inventory:write'
    );

    const res = await request(app)
      .post('/api/v1/inventory/categories')
      .set('Authorization', `Bearer ${token}`)
      .send({});

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/locations
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/locations', () => {
  it('returns 200 with all locations', async () => {
    const token = await createAndLoginUser('loc-list@example.com');
    await seedLocation('Warehouse A');

    const res = await request(app)
      .get('/api/v1/inventory/locations')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/inventory/locations');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /inventory/locations
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/inventory/locations', () => {
  it('returns 201 with created location', async () => {
  const permission = await prisma.permission.upsert({
    where: { code: 'inventory:write' },
    create: { code: 'inventory:write', description: 'Create and update inventory' },
    update: {},
  });

  const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'manager' } });

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: managerRole.id, permissionId: permission.id } },
    create: { roleId: managerRole.id, permissionId: permission.id },
    update: {},
  });

  const token = await createAndLoginUser('loc-create@example.com', 'manager');

  const res = await request(app)
    .post('/api/v1/inventory/locations')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Warehouse B', description: 'Secondary store' });

  expect(res.status).toBe(201);
  expect(res.body.name).toBe('Warehouse B');
  expect(res.body.description).toBe('Secondary store');
});

it('returns 422 if name is missing', async () => {
  const permission = await prisma.permission.upsert({
    where: { code: 'inventory:write' },
    create: { code: 'inventory:write', description: 'Create and update inventory' },
    update: {},
  });

  const managerRole = await prisma.role.findUniqueOrThrow({ where: { name: 'manager' } });

  await prisma.rolePermission.upsert({
    where: { roleId_permissionId: { roleId: managerRole.id, permissionId: permission.id } },
    create: { roleId: managerRole.id, permissionId: permission.id },
    update: {},
  });

  const token = await createAndLoginUser('loc-422@example.com', 'manager');

  const res = await request(app)
    .post('/api/v1/inventory/locations')
    .set('Authorization', `Bearer ${token}`)
    .send({});

  expect(res.status).toBe(422);
});
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/items
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/items', () => {
  it('returns 200 with paginated items', async () => {
    const token = await createAndLoginUser('items-list@example.com');
    const account = await prisma.account.findUnique({ where: { email: 'items-list@example.com' } });
    await seedItem(account!.id);

    const res = await request(app)
      .get('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('returns only active items', async () => {
    const token = await createAndLoginUser('items-active@example.com');
    const account = await prisma.account.findUnique({ where: { email: 'items-active@example.com' } });
    await seedItem(account!.id, { isActive: false });

    const res = await request(app)
      .get('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.every((i: { is_active: boolean }) => i.is_active === true)).toBe(true);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/inventory/items');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /inventory/items
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/inventory/items', () => {
  it('returns 201 with created item', async () => {
    const token = await createAndLoginWithPermission(
      'item-create@example.com',
      'employee',
      'inventory:write'
    );

    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'PROJ-001', name: 'Projector', unit: 'pcs' });

    expect(res.status).toBe(201);
    expect(res.body.sku).toBe('PROJ-001');
    expect(res.body.is_active).toBe(true);
    expect(res.body.version).toBe(0);
  });

  it('returns 409 if SKU already exists', async () => {
    const token = await createAndLoginWithPermission(
      'item-dup@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'item-dup@example.com' } });
    await seedItem(account!.id, { sku: 'DUP-001' });

    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'DUP-001', name: 'Duplicate', unit: 'pcs' });

    expect(res.status).toBe(409);
  });

  it('returns 403 if no inventory:write permission', async () => {
    const token = await createAndLoginUser('item-noperm@example.com', 'employee');

    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ sku: 'PROJ-002', name: 'Projector', unit: 'pcs' });

    expect(res.status).toBe(403);
  });

  it('returns 422 if required fields are missing', async () => {
    const token = await createAndLoginWithPermission(
      'item-422@example.com',
      'employee',
      'inventory:write'
    );

    const res = await request(app)
      .post('/api/v1/inventory/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No SKU' });

    expect(res.status).toBe(422);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/items/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/items/:id', () => {
  it('returns 200 with item and stock levels', async () => {
    const token = await createAndLoginUser('item-get@example.com');
    const account = await prisma.account.findUnique({ where: { email: 'item-get@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('Shelf 1');
    await seedStockLevel(item.id, location.id, 10);

    const res = await request(app)
      .get(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(item.id);
    expect(res.body.stock_levels).toHaveLength(1);
    expect(res.body.stock_levels[0].quantity).toBe(10);
  });

  it('returns 404 if item does not exist', async () => {
    const token = await createAndLoginUser('item-404@example.com');

    const res = await request(app)
      .get('/api/v1/inventory/items/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 if item is inactive', async () => {
    const token = await createAndLoginUser('item-inactive@example.com');
    const account = await prisma.account.findUnique({ where: { email: 'item-inactive@example.com' } });
    const item = await seedItem(account!.id, { isActive: false });

    const res = await request(app)
      .get(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /inventory/items/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/inventory/items/:id', () => {
  it('returns 200 and increments version on success', async () => {
    const token = await createAndLoginWithPermission(
      'item-patch@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'item-patch@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .patch(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 0, name: 'Updated Projector' });

    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Updated Projector');
    expect(res.body.version).toBe(1);
  });

  it('returns 409 on version mismatch', async () => {
    const token = await createAndLoginWithPermission(
      'item-version@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'item-version@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .patch(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 99, name: 'Stale Update' });

    expect(res.status).toBe(409);
  });

  it('returns 404 if item does not exist', async () => {
    const token = await createAndLoginWithPermission(
      'item-patch404@example.com',
      'employee',
      'inventory:write'
    );

    const res = await request(app)
      .patch('/api/v1/inventory/items/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 0, name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('returns 422 if version is missing', async () => {
    const token = await createAndLoginWithPermission(
      'item-patch422@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'item-patch422@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .patch(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'No version' });

    expect(res.status).toBe(422);
  });

  it('returns 403 if no inventory:write permission', async () => {
    const token = await createAndLoginUser('item-patchnoperm@example.com', 'employee');
    const account = await prisma.account.findUnique({ where: { email: 'item-patchnoperm@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .patch(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ version: 0, name: 'Unauthorized' });

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /inventory/items/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/v1/inventory/items/:id', () => {
  it('returns 204 and soft deletes item', async () => {
    const token = await createAndLoginUser('item-delete@example.com', 'admin');
    const account = await prisma.account.findUnique({ where: { email: 'item-delete@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .delete(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(204);

    const deleted = await prisma.item.findUnique({ where: { id: item.id } });
    expect(deleted!.isActive).toBe(false);
  });

  it('returns 404 if item does not exist', async () => {
    const token = await createAndLoginUser('item-delete404@example.com', 'admin');

    const res = await request(app)
      .delete('/api/v1/inventory/items/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 if not admin', async () => {
    const token = await createAndLoginUser('item-deletenoperm@example.com', 'employee');
    const account = await prisma.account.findUnique({ where: { email: 'item-deletenoperm@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .delete(`/api/v1/inventory/items/${item.id}`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/items/:id/stock
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/items/:id/stock', () => {
  it('returns 200 with stock levels', async () => {
    const token = await createAndLoginUser('stock-get@example.com');
    const account = await prisma.account.findUnique({ where: { email: 'stock-get@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('Stock Shelf');
    await seedStockLevel(item.id, location.id, 7);

    const res = await request(app)
      .get(`/api/v1/inventory/items/${item.id}/stock`)
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].quantity).toBe(7);
    expect(res.body[0].location_name).toBe('Stock Shelf');
  });

  it('returns 404 if item does not exist', async () => {
    const token = await createAndLoginUser('stock-404@example.com');

    const res = await request(app)
      .get('/api/v1/inventory/items/00000000-0000-0000-0000-000000000000/stock')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /inventory/transactions
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/inventory/transactions', () => {
  it('returns 201 and updates stock level atomically', async () => {
    const token = await createAndLoginWithPermission(
      'tx-create@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'tx-create@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('TX Shelf');

    const res = await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: item.id,
        location_id: location.id,
        type: 'in',
        quantity_delta: 10,
      });

    expect(res.status).toBe(201);
    expect(res.body.type).toBe('in');
    expect(res.body.quantity_delta).toBe(10);

    const stock = await prisma.stockLevel.findUnique({
      where: { itemId_locationId: { itemId: item.id, locationId: location.id } },
    });
    expect(stock!.quantity).toBe(10);
  });

  it('returns 422 if type is in but quantity_delta is negative', async () => {
    const token = await createAndLoginWithPermission(
      'tx-422@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'tx-422@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('TX Shelf 2');

    const res = await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: item.id,
        location_id: location.id,
        type: 'in',
        quantity_delta: -5,
      });

    expect(res.status).toBe(422);
  });

  it('returns 404 if item does not exist', async () => {
    const token = await createAndLoginWithPermission(
      'tx-404item@example.com',
      'employee',
      'inventory:write'
    );
    const location = await seedLocation('TX Shelf 3');

    const res = await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: '00000000-0000-0000-0000-000000000000',
        location_id: location.id,
        type: 'in',
        quantity_delta: 5,
      });

    expect(res.status).toBe(404);
  });

  it('returns 404 if location does not exist', async () => {
    const token = await createAndLoginWithPermission(
      'tx-404loc@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'tx-404loc@example.com' } });
    const item = await seedItem(account!.id);

    const res = await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: item.id,
        location_id: '00000000-0000-0000-0000-000000000000',
        type: 'in',
        quantity_delta: 5,
      });

    expect(res.status).toBe(404);
  });

  it('returns 403 if no inventory:write permission', async () => {
    const token = await createAndLoginUser('tx-noperm@example.com', 'employee');
    const account = await prisma.account.findUnique({ where: { email: 'tx-noperm@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('TX Shelf 4');

    const res = await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        item_id: item.id,
        location_id: location.id,
        type: 'in',
        quantity_delta: 5,
      });

    expect(res.status).toBe(403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /inventory/transactions
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/inventory/transactions', () => {
  it('returns 200 with paginated transactions', async () => {
    const token = await createAndLoginWithPermission(
      'tx-list@example.com',
      'employee',
      'inventory:write'
    );
    const account = await prisma.account.findUnique({ where: { email: 'tx-list@example.com' } });
    const item = await seedItem(account!.id);
    const location = await seedLocation('TX List Shelf');

    await request(app)
      .post('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`)
      .send({ item_id: item.id, location_id: location.id, type: 'in', quantity_delta: 5 });

    const res = await request(app)
      .get('/api/v1/inventory/transactions')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(res.body.meta).toBeDefined();
    expect(res.body.data.length).toBeGreaterThan(0);
  });

  it('returns 401 if no token', async () => {
    const res = await request(app).get('/api/v1/inventory/transactions');
    expect(res.status).toBe(401);
  });
});