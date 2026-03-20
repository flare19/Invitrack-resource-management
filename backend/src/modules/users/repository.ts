import prisma from '../../config/prisma';

export async function findAccountWithProfile(accountId: string) {
  return prisma.account.findUnique({
    where: { id: accountId },
    select: {
      id: true,
      email: true,
      isVerified: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      profile: {
        select: {
          fullName: true,
          displayName: true,
          avatarUrl: true,
          department: true,
          createdAt: true,
          updatedAt: true,
        },
      },
      accountRoles: {
        select: {
          role: {
            select: {
              id: true,
              name: true,
              priority: true,
            },
          },
        },
      },
    },
  });
}

export async function updateProfileById(
  accountId: string,
  data: {
    fullName?: string;
    displayName?: string;
    department?: string;
  }
) {
  return prisma.profile.update({
    where: { id: accountId },
    data,
  });
}