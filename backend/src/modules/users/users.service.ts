import { AppError } from '../../errors/AppError';
import { findAccountWithProfile, updateProfileById } from './repository';
import { UpdateProfileDTO, UserProfileDTO } from './types';

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