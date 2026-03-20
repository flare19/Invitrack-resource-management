import { AppError } from '../../../errors/AppError';
import { getMyProfileService, updateMyProfileService, uploadAvatarService } from '../users.service';

// ─── Mock the entire repository module ───────────────────────────────────────
jest.mock('../repository');

// ─── Import mocked repository functions ──────────────────────────────────────
import { findAccountWithProfile, updateProfileById } from '../repository';

// ─── Cast mocks ───────────────────────────────────────────────────────────────
const mockFindAccountWithProfile = findAccountWithProfile as jest.MockedFunction<typeof findAccountWithProfile>;
const mockUpdateProfileById = updateProfileById as jest.MockedFunction<typeof updateProfileById>;

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