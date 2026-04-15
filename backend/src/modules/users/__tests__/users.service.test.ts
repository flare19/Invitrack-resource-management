import { AppError } from '../../../errors/AppError';
import { getMyProfileService, updateMyProfileService, uploadAvatarService, listUsersService,
  getUserByIdService,
  updateUserByIdService,
  listRolesService,
  assignRoleService,
  removeRoleService,
  listPermissionsService,
  listRolePermissionsService,
  assignPermissionToRoleService,
  removePermissionFromRoleService } from '../users.service';

// ─── Mock the entire repository module ───────────────────────────────────────
jest.mock('../repository');
// ─── Mock the audit module ────────────────────────────────────────────────────
jest.mock('../../../modules/audit/audit.service');

// ─── Import mocked repository functions ──────────────────────────────────────
import { findAccountWithProfile, updateProfileById, findManyAccounts,
  updateUserById,
  findAllRoles,
  findRoleById,
  findAccountRole,
  createAccountRole,
  deleteAccountRole,
  findAccountById,
  listPermissions,
  listRolePermissions,
  findPermissionById,
  findRolePermission,
  assignPermissionToRole,
  removePermissionFromRole } from '../repository';
import { createAuditEvent } from '../../../modules/audit/audit.service';

// ─── Cast mocks ───────────────────────────────────────────────────────────────
const mockFindAccountWithProfile = findAccountWithProfile as jest.MockedFunction<typeof findAccountWithProfile>;
const mockUpdateProfileById = updateProfileById as jest.MockedFunction<typeof updateProfileById>;
const mockFindManyAccounts = findManyAccounts as jest.MockedFunction<typeof findManyAccounts>;
const mockUpdateUserById = updateUserById as jest.MockedFunction<typeof updateUserById>;
const mockFindAllRoles = findAllRoles as jest.MockedFunction<typeof findAllRoles>;
const mockFindRoleById = findRoleById as jest.MockedFunction<typeof findRoleById>;
const mockFindAccountRole = findAccountRole as jest.MockedFunction<typeof findAccountRole>;
const mockCreateAccountRole = createAccountRole as jest.MockedFunction<typeof createAccountRole>;
const mockDeleteAccountRole = deleteAccountRole as jest.MockedFunction<typeof deleteAccountRole>;
const mockFindAccountById = findAccountById as jest.MockedFunction<typeof findAccountById>;
const mockListPermissions = listPermissions as jest.MockedFunction<typeof listPermissions>;
const mockListRolePermissions = listRolePermissions as jest.MockedFunction<typeof listRolePermissions>;
const mockFindPermissionById = findPermissionById as jest.MockedFunction<typeof findPermissionById>;
const mockFindRolePermission = findRolePermission as jest.MockedFunction<typeof findRolePermission>;
const mockAssignPermissionToRole = assignPermissionToRole as jest.MockedFunction<typeof assignPermissionToRole>;
const mockRemovePermissionFromRole = removePermissionFromRole as jest.MockedFunction<typeof removePermissionFromRole>;
const mockCreateAuditEvent = createAuditEvent as jest.MockedFunction<typeof createAuditEvent>;

// ─── Additional fixtures ──────────────────────────────────────────────────────
const fakeRoles = [
  { id: 1, name: 'admin', description: 'Administrator', priority: 100 },
  { id: 2, name: 'manager', description: 'Manager', priority: 50 },
  { id: 3, name: 'employee', description: 'Employee', priority: 10 },
];

const fakeAssignment = {
  accountId: 'account-uuid-123',
  roleId: 2,
  grantedBy: 'admin-uuid-456',
  grantedAt: new Date('2024-01-01T00:00:00Z'),
};

// ─── Shared test fixtures ─────────────────────────────────────────────────────
const fakeAccount = {
  id: 'account-uuid-123',
  email: 'test@example.com',
  isVerified: true,
  isActive: true,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  profile: {
    fullName: 'Jane Doe',
    displayName: 'Jane',
    avatarUrl: null,
    department: 'Engineering',
    createdAt: new Date('2024-01-01T00:00:00Z'),
    updatedAt: new Date('2024-01-01T00:00:00Z'),
  },
  accountRoles: [
    {
      role: {
        id: 2,
        name: 'employee',
        priority: 10,
      },
    },
  ],
};

// ─── Clear all mocks between tests ───────────────────────────────────────────
beforeEach(() => {
  jest.clearAllMocks();
  mockCreateAuditEvent.mockResolvedValue(undefined as any);
});

// ═════════════════════════════════════════════════════════════════════════════
// getMyProfileService
// ═════════════════════════════════════════════════════════════════════════════
describe('getMyProfileService', () => {
  it('returns a formatted profile DTO on success', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);

    const result = await getMyProfileService(fakeAccount.id);

    expect(mockFindAccountWithProfile).toHaveBeenCalledWith(fakeAccount.id);
    expect(result.id).toBe(fakeAccount.id);
    expect(result.email).toBe(fakeAccount.email);
    expect(result.full_name).toBe(fakeAccount.profile.fullName);
    expect(result.roles).toHaveLength(1);
    expect(result.roles[0]?.name).toBe('employee');
  });

  it('throws 404 if account is not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(null);

    await expect(getMyProfileService(fakeAccount.id)).rejects.toThrow(
      new AppError(404, 'USER_NOT_FOUND', 'User not found.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updateMyProfileService
// ═════════════════════════════════════════════════════════════════════════════
describe('updateMyProfileService', () => {
  it('updates profile and returns updated DTO on success', async () => {
    const updatedAccount = {
      ...fakeAccount,
      profile: {
        ...fakeAccount.profile,
        fullName: 'Jane Updated',
        department: 'Product',
      },
    };

    mockFindAccountWithProfile
      .mockResolvedValueOnce(fakeAccount as any)   // first call — existence check
      .mockResolvedValueOnce(updatedAccount as any); // second call — fetch updated

    mockUpdateProfileById.mockResolvedValue(undefined as any);

    const result = await updateMyProfileService(fakeAccount.id, {
      full_name: 'Jane Updated',
      department: 'Product',
    });

    expect(mockFindAccountWithProfile).toHaveBeenCalledTimes(2);
    expect(mockUpdateProfileById).toHaveBeenCalledTimes(1);
    expect(result.full_name).toBe('Jane Updated');
    expect(result.department).toBe('Product');
  });

  it('throws 404 if account is not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(null);

    await expect(
      updateMyProfileService(fakeAccount.id, { full_name: 'Jane Updated' })
    ).rejects.toThrow(new AppError(404, 'USER_NOT_FOUND', 'User not found.'));

    expect(mockUpdateProfileById).not.toHaveBeenCalled();
  });

  it('only passes provided fields to the repository', async () => {
    mockFindAccountWithProfile
      .mockResolvedValueOnce(fakeAccount as any)
      .mockResolvedValueOnce(fakeAccount as any);

    mockUpdateProfileById.mockResolvedValue(undefined as any);

    await updateMyProfileService(fakeAccount.id, { department: 'Design' });

    expect(mockUpdateProfileById).toHaveBeenCalledWith(fakeAccount.id, {
      department: 'Design',
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// uploadAvatarService
// ═════════════════════════════════════════════════════════════════════════════
describe('uploadAvatarService', () => {
  it('throws 501 Not Implemented', async () => {
    await expect(uploadAvatarService()).rejects.toThrow(
      new AppError(501, 'NOT_IMPLEMENTED', 'Avatar upload is not yet implemented.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// listRolesService
// ═════════════════════════════════════════════════════════════════════════════
describe('listRolesService', () => {
  it('returns all roles', async () => {
    mockFindAllRoles.mockResolvedValue(fakeRoles);

    const result = await listRolesService();

    expect(mockFindAllRoles).toHaveBeenCalledTimes(1);
    expect(result).toHaveLength(3);
    expect(result[0]?.name).toBe('admin');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// listUsersService
// ═════════════════════════════════════════════════════════════════════════════
describe('listUsersService', () => {
  it('returns paginated response with correct meta', async () => {
    mockFindManyAccounts.mockResolvedValue({
      accounts: [fakeAccount as any],
      total: 1,
    });

    const result = await listUsersService({ page: 1, per_page: 20 });

    expect(result.meta).toEqual({ page: 1, per_page: 20, total: 1 });
    expect(result.data).toHaveLength(1);
  });

  it('defaults page to 1 and per_page to 20 when not provided', async () => {
    mockFindManyAccounts.mockResolvedValue({ accounts: [], total: 0 });

    const result = await listUsersService({});

    expect(mockFindManyAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, perPage: 20 })
    );
    expect(result.meta.page).toBe(1);
    expect(result.meta.per_page).toBe(20);
  });

  it('caps per_page at 100', async () => {
    mockFindManyAccounts.mockResolvedValue({ accounts: [], total: 0 });

    await listUsersService({ per_page: 999 });

    expect(mockFindManyAccounts).toHaveBeenCalledWith(
      expect.objectContaining({ perPage: 100 })
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getUserByIdService
// ═════════════════════════════════════════════════════════════════════════════
describe('getUserByIdService', () => {
  it('returns formatted profile on success', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);

    const result = await getUserByIdService(fakeAccount.id);

    expect(result.id).toBe(fakeAccount.id);
    expect(result.email).toBe(fakeAccount.email);
  });

  it('throws 404 if account not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(null);

    await expect(getUserByIdService('nonexistent')).rejects.toThrow(
      new AppError(404, 'USER_NOT_FOUND', 'User not found.')
    );
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// updateUserByIdService
// ═════════════════════════════════════════════════════════════════════════════
describe('updateUserByIdService', () => {
  it('throws 404 if account not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(null);

    await expect(
      updateUserByIdService('nonexistent', { full_name: 'Test' })
    ).rejects.toThrow(new AppError(404, 'USER_NOT_FOUND', 'User not found.'));

    expect(mockUpdateUserById).not.toHaveBeenCalled();
  });

  it('calls updateUserById with correct mapped fields', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);
    mockUpdateUserById.mockResolvedValue(fakeAccount as any);

    await updateUserByIdService(fakeAccount.id, {
      full_name: 'New Name',
      is_active: false,
    });

    expect(mockUpdateUserById).toHaveBeenCalledWith(fakeAccount.id, {
      fullName: 'New Name',
      isActive: false,
    });
  });

  it('only passes provided fields — omits undefined keys', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);
    mockUpdateUserById.mockResolvedValue(fakeAccount as any);

    await updateUserByIdService(fakeAccount.id, { is_active: true });

    expect(mockUpdateUserById).toHaveBeenCalledWith(fakeAccount.id, {
      isActive: true,
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// assignRoleService
// ═════════════════════════════════════════════════════════════════════════════
describe('assignRoleService', () => {
  it('returns assignment DTO on success', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);
    mockFindRoleById.mockResolvedValue(fakeRoles[1] as any);
    mockFindAccountRole.mockResolvedValue(null);
    mockCreateAccountRole.mockResolvedValue(fakeAssignment as any);

    const result = await assignRoleService(fakeAccount.id, 2, 'admin-uuid-456');

    expect(result).toMatchObject({
      account_id: fakeAssignment.accountId,
      role_id: fakeAssignment.roleId,
      granted_by: fakeAssignment.grantedBy,
    });
  });

  it('throws 404 if account not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(null);

    await expect(
      assignRoleService('nonexistent', 2, 'admin-uuid')
    ).rejects.toThrow(new AppError(404, 'USER_NOT_FOUND', 'User not found.'));
  });

  it('throws 404 if role not found', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);
    mockFindRoleById.mockResolvedValue(null);

    await expect(
      assignRoleService(fakeAccount.id, 999, 'admin-uuid')
    ).rejects.toThrow(new AppError(404, 'ROLE_NOT_FOUND', 'Role not found.'));
  });

  it('throws 409 if role already assigned', async () => {
    mockFindAccountWithProfile.mockResolvedValue(fakeAccount as any);
    mockFindRoleById.mockResolvedValue(fakeRoles[1] as any);
    mockFindAccountRole.mockResolvedValue(fakeAssignment as any);

    await expect(
      assignRoleService(fakeAccount.id, 2, 'admin-uuid')
    ).rejects.toThrow(new AppError(409, 'ROLE_ALREADY_ASSIGNED', 'User already has this role.'));

    expect(mockCreateAccountRole).not.toHaveBeenCalled();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// removeRoleService
// ═════════════════════════════════════════════════════════════════════════════
describe('removeRoleService', () => {
  it('calls deleteAccountRole on success', async () => {
    mockFindAccountById.mockResolvedValue(fakeAccount as any);
    mockFindAccountRole.mockResolvedValue(fakeAssignment as any);
    mockDeleteAccountRole.mockResolvedValue(fakeAssignment as any);

    await removeRoleService(fakeAccount.id, 2);

    expect(mockDeleteAccountRole).toHaveBeenCalledWith(fakeAccount.id, 2);
  });

  it('throws 404 if account not found', async () => {
    mockFindAccountById.mockResolvedValue(null);

    await expect(removeRoleService('nonexistent', 2)).rejects.toThrow(
      new AppError(404, 'USER_NOT_FOUND', 'User not found.')
    );

    expect(mockDeleteAccountRole).not.toHaveBeenCalled();
  });

  it('throws 404 if assignment not found', async () => {
    mockFindAccountById.mockResolvedValue(fakeAccount as any);
    mockFindAccountRole.mockResolvedValue(null);

    await expect(removeRoleService(fakeAccount.id, 2)).rejects.toThrow(
      new AppError(404, 'ROLE_ASSIGNMENT_NOT_FOUND', 'Role assignment not found.')
    );

    expect(mockDeleteAccountRole).not.toHaveBeenCalled();
  });
});

// ─── listPermissionsService ───────────────────────────────────────────────────

describe('listPermissionsService', () => {
  it('returns all permissions', async () => {
    const permissions = [
      { id: 1, code: 'inventory:write', description: 'Write inventory' },
      { id: 2, code: 'bookings:approve', description: 'Approve bookings' },
    ];
    mockListPermissions.mockResolvedValue(permissions);

    const result = await listPermissionsService();
    expect(result).toEqual(permissions);
    expect(mockListPermissions).toHaveBeenCalledTimes(1);
  });
});

// ─── listRolePermissionsService ───────────────────────────────────────────────

describe('listRolePermissionsService', () => {
  it('returns permissions for a valid role', async () => {
    const role = { id: 2, name: 'manager', description: null, priority: 50 };
    const rows = [
      { roleId: 2, permissionId: 1, permission: { id: 1, code: 'inventory:write', description: null } },
    ];
    mockFindRoleById.mockResolvedValue(role);
    mockListRolePermissions.mockResolvedValue(rows);

    const result = await listRolePermissionsService(2);
    expect(result).toEqual([{ id: 1, code: 'inventory:write', description: null }]);
  });

  it('throws 404 if role not found', async () => {
    mockFindRoleById.mockResolvedValue(null);
    await expect(listRolePermissionsService(99)).rejects.toThrow(AppError);
    await expect(listRolePermissionsService(99)).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
  });

  it('throws 404 for out-of-range roleId', async () => {
    await expect(listRolePermissionsService(99999)).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
    expect(mockFindRoleById).not.toHaveBeenCalled();
  });
});

// ─── assignPermissionToRoleService ───────────────────────────────────────────

describe('assignPermissionToRoleService', () => {
  const role = { id: 2, name: 'manager', description: null, priority: 50 };
  const permission = { id: 1, code: 'inventory:write', description: null };

  it('assigns a permission to a role', async () => {
    mockFindRoleById.mockResolvedValue(role);
    mockFindPermissionById.mockResolvedValue(permission);
    mockFindRolePermission.mockResolvedValue(null);
    mockAssignPermissionToRole.mockResolvedValue({ roleId: 2, permissionId: 1 });

    const result = await assignPermissionToRoleService(2, 1);
    expect(result).toEqual({ roleId: 2, permissionId: 1 });
  });

  it('throws 404 if role not found', async () => {
    mockFindRoleById.mockResolvedValue(null);
    await expect(assignPermissionToRoleService(2, 1)).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
  });

  it('throws 404 if permission not found', async () => {
    mockFindRoleById.mockResolvedValue(role);
    mockFindPermissionById.mockResolvedValue(null);
    await expect(assignPermissionToRoleService(2, 1)).rejects.toMatchObject({ statusCode: 404, code: 'PERMISSION_NOT_FOUND' });
  });

  it('throws 409 if already assigned', async () => {
    mockFindRoleById.mockResolvedValue(role);
    mockFindPermissionById.mockResolvedValue(permission);
    mockFindRolePermission.mockResolvedValue({ roleId: 2, permissionId: 1 });
    await expect(assignPermissionToRoleService(2, 1)).rejects.toMatchObject({ statusCode: 409, code: 'PERMISSION_ALREADY_ASSIGNED' });
  });

  it('throws 404 for out-of-range roleId', async () => {
    await expect(assignPermissionToRoleService(99999, 1)).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
    expect(mockFindRoleById).not.toHaveBeenCalled();
  });

  it('throws 404 for out-of-range permissionId', async () => {
    mockFindRoleById.mockResolvedValue(role);
    await expect(assignPermissionToRoleService(2, 99999)).rejects.toMatchObject({ statusCode: 404, code: 'PERMISSION_NOT_FOUND' });
    expect(mockFindPermissionById).not.toHaveBeenCalled();
  });
});

// ─── removePermissionFromRoleService ─────────────────────────────────────────

describe('removePermissionFromRoleService', () => {
  it('removes an existing assignment', async () => {
    mockFindRolePermission.mockResolvedValue({ roleId: 2, permissionId: 1 });
    mockRemovePermissionFromRole.mockResolvedValue({ roleId: 2, permissionId: 1 });

    await expect(removePermissionFromRoleService(2, 1)).resolves.toBeUndefined();
    expect(mockRemovePermissionFromRole).toHaveBeenCalledWith(2, 1);
  });

  it('throws 404 if assignment not found', async () => {
    mockFindRolePermission.mockResolvedValue(null);
    await expect(removePermissionFromRoleService(2, 1)).rejects.toMatchObject({ statusCode: 404, code: 'ASSIGNMENT_NOT_FOUND' });
    expect(mockRemovePermissionFromRole).not.toHaveBeenCalled();
  });

  it('throws 404 for out-of-range roleId', async () => {
    await expect(removePermissionFromRoleService(99999, 1)).rejects.toMatchObject({ statusCode: 404, code: 'ROLE_NOT_FOUND' });
    expect(mockFindRolePermission).not.toHaveBeenCalled();
  });

  it('throws 404 for out-of-range permissionId', async () => {
    await expect(removePermissionFromRoleService(2, 99999)).rejects.toMatchObject({ statusCode: 404, code: 'PERMISSION_NOT_FOUND' });
    expect(mockFindRolePermission).not.toHaveBeenCalled();
  });
});