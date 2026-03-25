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

// ─── Extended helper for role-specific accounts ───────────────────────────────
async function registerAndLoginAs(
  role: 'admin' | 'manager' | 'employee',
  email: string
) {
  const password = 'password123';
  const passwordHash = await bcrypt.hash(password, 10);

  const account = await prisma.account.create({
    data: {
      email: email.toLowerCase(),
      passwordHash,
      isVerified: true,
      profile: { create: { fullName: 'Test User' } },
      accountRoles: {
        create: {
          role: { connect: { name: role } },
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

let adminToken: string;
let managerToken: string;
let employeeToken: string;
let inventoryWritePermissionId: number;
let bookingsApprovePermissionId: number;

// ═════════════════════════════════════════════════════════════════════════════
// GET /users/roles
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/users/roles', () => {
  it('returns 200 with all roles for any authenticated user', async () => {
    const { accessToken } = await registerAndLoginAs('employee', 'roles-employee@example.com');

    const res = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThanOrEqual(3);
    expect(res.body[0]).toMatchObject({
      id: expect.any(Number),
      name: expect.any(String),
      description: expect.any(String),
      priority: expect.any(Number),
    });
  });

  it('returns 401 if no token is provided', async () => {
    const res = await request(app).get('/api/v1/users/roles');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /users
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/users', () => {
  it('returns 200 with paginated list for admin', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'list-admin@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toMatchObject({
      page: 1,
      per_page: 20,
      total: expect.any(Number),
    });
  });

  it('returns 200 with paginated list for manager', async () => {
    const { accessToken } = await registerAndLoginAs('manager', 'list-manager@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 for employee', async () => {
    const { accessToken } = await registerAndLoginAs('employee', 'list-employee@example.com');

    const res = await request(app)
      .get('/api/v1/users')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 if no token is provided', async () => {
    const res = await request(app).get('/api/v1/users');
    expect(res.status).toBe(401);
  });

  it('respects per_page param', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'list-perpage@example.com');

    const res = await request(app)
      .get('/api/v1/users?page=1&per_page=1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.meta.per_page).toBe(1);
  });

  it('returns 422 for invalid page param', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'list-invalid@example.com');

    const res = await request(app)
      .get('/api/v1/users?page=abc')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('filters by is_active', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'list-filter@example.com');

    const res = await request(app)
      .get('/api/v1/users?is_active=true')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((user: any) => {
      expect(user.is_active).toBe(true);
    });
  });

  it('filters by department', async () => {
    const { account } = await registerAndLoginAs('admin', 'list-dept-admin@example.com');

    // Set department on this account's profile
    await prisma.profile.update({
      where: { id: account.id },
      data: { department: 'Engineering' },
    });

    const { accessToken } = await registerAndLoginAs('admin', 'list-dept-viewer@example.com');

    const res = await request(app)
      .get('/api/v1/users?department=Engineering')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    res.body.data.forEach((user: any) => {
      expect(user.department).toBe('Engineering');
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// GET /users/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('GET /api/v1/users/:id', () => {
  it('returns 200 with correct profile shape for admin', async () => {
    const { account } = await registerAndLoginAs('employee', 'getbyid-target@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'getbyid-admin@example.com');

    const res = await request(app)
      .get(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(account.id);
    expect(res.body.email).toBe('getbyid-target@example.com');
    expect(res.body.roles).toHaveLength(1);
  });

  it('returns 200 for manager', async () => {
    const { account } = await registerAndLoginAs('employee', 'getbyid-target2@example.com');
    const { accessToken } = await registerAndLoginAs('manager', 'getbyid-manager@example.com');

    const res = await request(app)
      .get(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
  });

  it('returns 403 for employee', async () => {
    const { account } = await registerAndLoginAs('employee', 'getbyid-target3@example.com');
    const { accessToken } = await registerAndLoginAs('employee', 'getbyid-emp@example.com');

    const res = await request(app)
      .get(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 404 for non-existent user', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'getbyid-404@example.com');

    const res = await request(app)
      .get('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 401 if no token provided', async () => {
    const res = await request(app).get('/api/v1/users/00000000-0000-0000-0000-000000000000');
    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// PATCH /users/:id
// ═════════════════════════════════════════════════════════════════════════════
describe('PATCH /api/v1/users/:id', () => {
  it('returns 200 and updates profile fields', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-target@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'patch-admin@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Updated Name' });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('Updated Name');
  });

  it('returns 200 and updates is_active — verifies write lands in auth.accounts', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-active@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'patch-active-admin@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.is_active).toBe(false);

    // Verify deactivated account cannot log in
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'patch-active@example.com', password: 'password123' });

    expect(loginRes.status).toBe(403);
  });

  it('returns 200 updating both profile and is_active atomically', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-both@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'patch-both-admin@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'New Name', is_active: false });

    expect(res.status).toBe(200);
    expect(res.body.full_name).toBe('New Name');
    expect(res.body.is_active).toBe(false);
  });

  it('returns 403 for manager', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-mgr-target@example.com');
    const { accessToken } = await registerAndLoginAs('manager', 'patch-mgr@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Should Fail' });

    expect(res.status).toBe(403);
  });

  it('returns 403 for employee', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-emp-target@example.com');
    const { accessToken } = await registerAndLoginAs('employee', 'patch-emp@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Should Fail' });

    expect(res.status).toBe(403);
  });

  it('returns 422 if is_active is a string', async () => {
    const { account } = await registerAndLoginAs('employee', 'patch-422-target@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'patch-422-admin@example.com');

    const res = await request(app)
      .patch(`/api/v1/users/${account.id}`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ is_active: 'true' });

    expect(res.status).toBe(422);
  });

  it('returns 404 for non-existent user', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'patch-404@example.com');

    const res = await request(app)
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ full_name: 'Ghost' });

    expect(res.status).toBe(404);
  });

  it('returns 401 if no token provided', async () => {
    const res = await request(app)
      .patch('/api/v1/users/00000000-0000-0000-0000-000000000000')
      .send({ full_name: 'Ghost' });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST /users/:id/roles
// ═════════════════════════════════════════════════════════════════════════════
describe('POST /api/v1/users/:id/roles', () => {
  it('returns 201 and assigns a role', async () => {
    const { account } = await registerAndLoginAs('employee', 'assign-target@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'assign-admin@example.com');

    // Get manager role id from the seeded roles
    const rolesRes = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    const managerRole = rolesRes.body.find((r: any) => r.name === 'manager');

    const res = await request(app)
      .post(`/api/v1/users/${account.id}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: managerRole.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      account_id: account.id,
      role_id: managerRole.id,
      granted_by: expect.any(String),
      granted_at: expect.any(String),
    });
  });

  it('returns 409 if role already assigned', async () => {
    const { account } = await registerAndLoginAs('employee', 'assign-dup@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'assign-dup-admin@example.com');

    const rolesRes = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    const employeeRole = rolesRes.body.find((r: any) => r.name === 'employee');

    // employee role is already assigned at account creation
    const res = await request(app)
      .post(`/api/v1/users/${account.id}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: employeeRole.id });

    expect(res.status).toBe(409);
  });

  it('returns 404 for non-existent user', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'assign-404-admin@example.com');

    const res = await request(app)
      .post('/api/v1/users/00000000-0000-0000-0000-000000000000/roles')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: 1 });

    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent role', async () => {
    const { account } = await registerAndLoginAs('employee', 'assign-role404@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'assign-role404-admin@example.com');

    const res = await request(app)
      .post(`/api/v1/users/${account.id}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: 99999 });

    expect(res.status).toBe(404);
  });

  it('returns 422 if role_id is a string', async () => {
    const { account } = await registerAndLoginAs('employee', 'assign-422@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'assign-422-admin@example.com');

    const res = await request(app)
      .post(`/api/v1/users/${account.id}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: '2' });

    expect(res.status).toBe(422);
  });

  it('returns 403 for employee', async () => {
    const { account } = await registerAndLoginAs('employee', 'assign-emp-target@example.com');
    const { accessToken } = await registerAndLoginAs('employee', 'assign-emp@example.com');

    const res = await request(app)
      .post(`/api/v1/users/${account.id}/roles`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ role_id: 1 });

    expect(res.status).toBe(403);
  });

  it('returns 401 if no token provided', async () => {
    const res = await request(app)
      .post('/api/v1/users/00000000-0000-0000-0000-000000000000/roles')
      .send({ role_id: 1 });

    expect(res.status).toBe(401);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// DELETE /users/:id/roles/:role_id
// ═════════════════════════════════════════════════════════════════════════════
describe('DELETE /api/v1/users/:id/roles/:role_id', () => {
  it('returns 204 and removes the role assignment', async () => {
    const { account } = await registerAndLoginAs('employee', 'remove-target@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'remove-admin@example.com');

    const rolesRes = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    const employeeRole = rolesRes.body.find((r: any) => r.name === 'employee');

    const res = await request(app)
      .delete(`/api/v1/users/${account.id}/roles/${employeeRole.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);
  });

  it('returns 404 if assignment does not exist', async () => {
    const { account } = await registerAndLoginAs('employee', 'remove-404@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'remove-404-admin@example.com');

    const rolesRes = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    const managerRole = rolesRes.body.find((r: any) => r.name === 'manager');

    // manager role was never assigned to this account
    const res = await request(app)
      .delete(`/api/v1/users/${account.id}/roles/${managerRole.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent user', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'remove-nouser@example.com');

    const res = await request(app)
      .delete('/api/v1/users/00000000-0000-0000-0000-000000000000/roles/1')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 for employee', async () => {
    const { account } = await registerAndLoginAs('employee', 'remove-emp-target@example.com');
    const { accessToken } = await registerAndLoginAs('employee', 'remove-emp@example.com');

    const rolesRes = await request(app)
      .get('/api/v1/users/roles')
      .set('Authorization', `Bearer ${accessToken}`);
    const employeeRole = rolesRes.body.find((r: any) => r.name === 'employee');

    const res = await request(app)
      .delete(`/api/v1/users/${account.id}/roles/${employeeRole.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 422 for non-numeric role_id', async () => {
    const { account } = await registerAndLoginAs('employee', 'remove-422@example.com');
    const { accessToken } = await registerAndLoginAs('admin', 'remove-422-admin@example.com');

    const res = await request(app)
      .delete(`/api/v1/users/${account.id}/roles/abc`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(422);
  });

  it('returns 401 if no token provided', async () => {
    const res = await request(app)
      .delete('/api/v1/users/00000000-0000-0000-0000-000000000000/roles/1');

    expect(res.status).toBe(401);
  });
});

beforeAll(async () => {
  const admin = await registerAndLoginAs('admin', 'admin-perms@example.com');
  const manager = await registerAndLoginAs('manager', 'manager-perms@example.com');
  const employee = await registerAndLoginAs('employee', 'employee-perms@example.com');

  adminToken = admin.accessToken;
  managerToken = manager.accessToken;
  employeeToken = employee.accessToken;

  // Seed two permissions for use across tests
  const p1 = await prisma.permission.create({
    data: { code: 'inventory:write', description: 'Write inventory' },
  });
  const p2 = await prisma.permission.create({
    data: { code: 'bookings:approve', description: 'Approve bookings' },
  });

  inventoryWritePermissionId = p1.id;
  bookingsApprovePermissionId = p2.id;
});

afterAll(async () => {
  await prisma.rolePermission.deleteMany({
    where: { permissionId: { in: [inventoryWritePermissionId, bookingsApprovePermissionId] } },
  });
  await prisma.permission.deleteMany({
    where: { id: { in: [inventoryWritePermissionId, bookingsApprovePermissionId] } },
  });
  await prisma.account.deleteMany({
    where: {
      email: {
        in: [
          'admin-perms@example.com',
          'manager-perms@example.com',
          'employee-perms@example.com',
        ],
      },
    },
  });
});

// src/modules/users/__tests__/users.integration.test.ts (additions)

// ─── GET /users/permissions ───────────────────────────────────────────────────

describe('GET /api/v1/users/permissions', () => {
  it('returns 200 with all permissions for admin', async () => {
  const { accessToken } = await registerAndLoginAs('admin', 'perms-list-admin@example.com');

  const res = await request(app)
    .get('/api/v1/users/permissions')
    .set('Authorization', `Bearer ${accessToken}`);

  console.log(res.body); // temporary
  expect(res.status).toBe(200);
  expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 403 for manager', async () => {
  const { accessToken } = await registerAndLoginAs('manager', 'perms-list-manager@example.com');

  const res = await request(app)
    .get('/api/v1/users/permissions')
    .set('Authorization', `Bearer ${accessToken}`);

  expect(res.status).toBe(403);
  });

  it('returns 403 for employee', async () => {
    const { accessToken } = await registerAndLoginAs('employee', 'perms-list-employee@example.com');

    const res = await request(app)
      .get('/api/v1/users/permissions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/users/permissions');
    expect(res.status).toBe(401);
  });
});

// ─── GET /users/roles/:role_id/permissions ────────────────────────────────────

describe('GET /api/v1/users/roles/:role_id/permissions', () => {
  it('returns 200 with permissions array for a valid role', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-get-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'manager' } });

    const res = await request(app)
      .get(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it('returns 404 for a non-existent role', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-404-admin@example.com');

    const res = await request(app)
      .get('/api/v1/users/roles/9999/permissions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 400 for a non-numeric role_id', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-400-admin@example.com');

    const res = await request(app)
      .get('/api/v1/users/roles/abc/permissions')
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(400);
  });

  it('returns 403 for manager', async () => {
    const { accessToken } = await registerAndLoginAs('manager', 'roleperms-403-manager@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'manager' } });

    const res = await request(app)
      .get(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).get('/api/v1/users/roles/1/permissions');
    expect(res.status).toBe(401);
  });
});

// ─── POST /users/roles/:role_id/permissions ───────────────────────────────────

describe('POST /api/v1/users/roles/:role_id/permissions', () => {
  it('returns 201 and assigns permission to role', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-post-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:post1', description: null } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permission_id: permission.id });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ role_id: role!.id, permission_id: permission.id });
  });

  it('returns 409 if permission already assigned', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-409-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:post2', description: null } });

    await prisma.rolePermission.create({ data: { roleId: role!.id, permissionId: permission.id } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permission_id: permission.id });

    expect(res.status).toBe(409);
  });

  it('returns 404 for non-existent role', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-404role-admin@example.com');
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:post3', description: null } });

    const res = await request(app)
      .post('/api/v1/users/roles/9999/permissions')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permission_id: permission.id });

    expect(res.status).toBe(404);
  });

  it('returns 404 for non-existent permission', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-404perm-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permission_id: 9999 });

    expect(res.status).toBe(404);
  });

  it('returns 422 if permission_id is missing', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-422-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({});

    expect(res.status).toBe(422);
  });

  it('returns 403 for manager', async () => {
    const { accessToken } = await registerAndLoginAs('manager', 'roleperms-403post-manager@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:post4', description: null } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ permission_id: permission.id });

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated request', async () => {
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });

    const res = await request(app)
      .post(`/api/v1/users/roles/${role!.id}/permissions`)
      .send({ permission_id: 1 });

    expect(res.status).toBe(401);
  });
});

// ─── DELETE /users/roles/:role_id/permissions/:permission_id ──────────────────

describe('DELETE /api/v1/users/roles/:role_id/permissions/:permission_id', () => {
  it('returns 204 and removes the assignment', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-del-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:del1', description: null } });
    await prisma.rolePermission.create({ data: { roleId: role!.id, permissionId: permission.id } });

    const res = await request(app)
      .delete(`/api/v1/users/roles/${role!.id}/permissions/${permission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(204);

    const assignment = await prisma.rolePermission.findUnique({
      where: { roleId_permissionId: { roleId: role!.id, permissionId: permission.id } },
    });
    expect(assignment).toBeNull();
  });

  it('returns 404 if assignment does not exist', async () => {
    const { accessToken } = await registerAndLoginAs('admin', 'roleperms-del404-admin@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:del2', description: null } });

    const res = await request(app)
      .delete(`/api/v1/users/roles/${role!.id}/permissions/${permission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(404);
  });

  it('returns 403 for manager', async () => {
    const { accessToken } = await registerAndLoginAs('manager', 'roleperms-del403-manager@example.com');
    const role = await prisma.role.findUnique({ where: { name: 'employee' } });
    const permission = await prisma.permission.create({ data: { code: 'inventory:write:del3', description: null } });
    await prisma.rolePermission.create({ data: { roleId: role!.id, permissionId: permission.id } });

    const res = await request(app)
      .delete(`/api/v1/users/roles/${role!.id}/permissions/${permission.id}`)
      .set('Authorization', `Bearer ${accessToken}`);

    expect(res.status).toBe(403);
  });

  it('returns 401 for unauthenticated request', async () => {
    const res = await request(app).delete('/api/v1/users/roles/1/permissions/1');
    expect(res.status).toBe(401);
  });
});