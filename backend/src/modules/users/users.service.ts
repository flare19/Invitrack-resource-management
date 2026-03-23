import { AppError } from '../../errors/AppError';
import { findAccountWithProfile, 
  updateProfileById,
  findManyAccounts,
  updateUserById,
  findAllRoles,
  findRoleById,
  findAccountRole,
  createAccountRole,
  deleteAccountRole,
  findAccountById } from './repository';
import { UpdateProfileDTO, 
  UserProfileDTO,
  UserListQueryDTO,
  UpdateUserByAdminDTO,
  AssignRoleDTO,
  AssignRoleResponseDTO,
  PaginatedResponseDTO, } from './types';

function formatProfileResponse(account: NonNullable<Awaited<ReturnType<typeof findAccountWithProfile>>>): UserProfileDTO {
  return {
    id: account.id,
    email: account.email,
    is_verified: account.isVerified,
    is_active: account.isActive,
    full_name: account.profile!.fullName,
    display_name: account.profile!.displayName ?? null,
    avatar_url: account.profile!.avatarUrl ?? null,
    department: account.profile!.department ?? null,
    roles: account.accountRoles.map((ar) => ({
      id: ar.role.id,
      name: ar.role.name,
      priority: ar.role.priority,
    })),
    created_at: account.createdAt,
    updated_at: account.updatedAt,
  };
}

export async function getMyProfileService(accountId: string): Promise<UserProfileDTO> {
  const account = await findAccountWithProfile(accountId);

  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  return formatProfileResponse(account);
}

export async function updateMyProfileService(
  accountId: string,
  dto: UpdateProfileDTO
): Promise<UserProfileDTO> {
  const account = await findAccountWithProfile(accountId);

  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const updateData: { fullName?: string; displayName?: string; department?: string } = {};
    if (dto.full_name !== undefined) updateData.fullName = dto.full_name;
    if (dto.display_name !== undefined) updateData.displayName = dto.display_name;
    if (dto.department !== undefined) updateData.department = dto.department;

    await updateProfileById(accountId, updateData);

  const updated = await findAccountWithProfile(accountId);
  return formatProfileResponse(updated!);
}

export async function uploadAvatarService(): Promise<never> {
  throw new AppError(501, 'NOT_IMPLEMENTED', 'Avatar upload is not yet implemented.');
}

// ─── Admin User Management ────────────────────────────────────────────────────

export async function listUsersService(
  query: UserListQueryDTO
): Promise<PaginatedResponseDTO<UserProfileDTO>> {
  const page = query.page ?? 1;
  const perPage = Math.min(query.per_page ?? 20, 100);

  const { accounts, total } = await findManyAccounts({
  page,
  perPage,
  ...(query.department !== undefined && { department: query.department }),
  ...(query.role !== undefined && { role: query.role }),
  ...(query.is_active !== undefined && { isActive: query.is_active }),
});

  return {
    data: accounts.map((account) => formatProfileResponse(account)),
    meta: { page, per_page: perPage, total },
  };
}

export async function getUserByIdService(accountId: string): Promise<UserProfileDTO> {
  const account = await findAccountWithProfile(accountId);

  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  return formatProfileResponse(account);
}

export async function updateUserByIdService(
  accountId: string,
  dto: UpdateUserByAdminDTO
): Promise<UserProfileDTO> {
  const account = await findAccountWithProfile(accountId);

  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const updateData: {
    fullName?: string;
    displayName?: string;
    department?: string;
    isActive?: boolean;
  } = {};

  if (dto.full_name !== undefined) updateData.fullName = dto.full_name;
  if (dto.display_name !== undefined) updateData.displayName = dto.display_name;
  if (dto.department !== undefined) updateData.department = dto.department;
  if (dto.is_active !== undefined) updateData.isActive = dto.is_active;

  const updated = await updateUserById(accountId, updateData);
  return formatProfileResponse(updated!);
}

// ─── Role Assignment ──────────────────────────────────────────────────────────

export async function listRolesService() {
  return findAllRoles();
}

export async function assignRoleService(
  accountId: string,
  roleId: number,
  grantedBy: string
): Promise<AssignRoleResponseDTO> {
  const account = await findAccountWithProfile(accountId);
  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  // SMALLINT max is 32767 — anything above will throw at the DB level
  if (roleId > 32767 || roleId < 1) {
    throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  }

  const role = await findRoleById(roleId);
  if (!role) {
    throw new AppError(404, 'ROLE_NOT_FOUND', 'Role not found.');
  }

  const existing = await findAccountRole(accountId, roleId);
  if (existing) {
    throw new AppError(409, 'ROLE_ALREADY_ASSIGNED', 'User already has this role.');
  }

  const assignment = await createAccountRole(accountId, roleId, grantedBy);
  return {
    account_id: assignment.accountId,
    role_id: assignment.roleId,
    granted_by: assignment.grantedBy!,
    granted_at: assignment.grantedAt,
  };
}

export async function removeRoleService(
  accountId: string,
  roleId: number
): Promise<void> {
  const account = await findAccountById(accountId);

  if (!account) {
    throw new AppError(404, 'USER_NOT_FOUND', 'User not found.');
  }

  const existing = await findAccountRole(accountId, roleId);

  if (!existing) {
    throw new AppError(404, 'ROLE_ASSIGNMENT_NOT_FOUND', 'Role assignment not found.');
  }

  await deleteAccountRole(accountId, roleId);
}