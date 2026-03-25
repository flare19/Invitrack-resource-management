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

// ─── Roles ────────────────────────────────────────────────────────────────────

export async function findAllRoles() {
  return prisma.role.findMany({
    select: {
      id: true,
      name: true,
      description: true,
      priority: true,
    },
    orderBy: { priority: 'desc' },
  });
}

export async function findRoleById(roleId: number) {
  return prisma.role.findFirst({
    where: { id: roleId },
  });
}

export async function findAccountRole(accountId: string, roleId: number) {
  return prisma.accountRole.findUnique({
    where: {
      accountId_roleId: {
        accountId,
        roleId,
      },
    },
  });
}

export async function createAccountRole(
  accountId: string,
  roleId: number,
  grantedBy: string
) {
  return prisma.accountRole.create({
    data: {
      accountId,
      roleId,
      grantedBy,
    },
  });
}

export async function deleteAccountRole(accountId: string, roleId: number) {
  return prisma.accountRole.delete({
    where: {
      accountId_roleId: {
        accountId,
        roleId,
      },
    },
  });
}

// ─── User list (admin/manager) ────────────────────────────────────────────────

export async function findManyAccounts(params: {
  page: number;
  perPage: number;
  department?: string;
  role?: string;
  isActive?: boolean;
}) {
  const { page, perPage, department, role, isActive } = params;
  const skip = (page - 1) * perPage;

  const where = {
    ...(isActive !== undefined && { isActive }),
    ...(department && {
      profile: { department },
    }),
    ...(role && {
      accountRoles: {
        some: {
          role: { name: role },
        },
      },
    }),
  };

  const [accounts, total] = await prisma.$transaction([
    prisma.account.findMany({
      where,
      skip,
      take: perPage,
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
      orderBy: { createdAt: 'desc' },
    }),
    prisma.account.count({ where }),
  ]);

  return { accounts, total };
}

// ─── Admin user update ────────────────────────────────────────────────────────

export async function updateUserById(
  accountId: string,
  data: {
    fullName?: string;
    displayName?: string;
    department?: string;
    isActive?: boolean;
  }
) {
  const { isActive, ...profileFields } = data;
  const hasProfileUpdate = Object.keys(profileFields).length > 0;
  const hasAccountUpdate = isActive !== undefined;

  // Both fields touched — wrap in a transaction
  if (hasProfileUpdate && hasAccountUpdate) {
    await prisma.$transaction([
      prisma.profile.update({
        where: { id: accountId },
        data: profileFields,
      }),
      prisma.account.update({
        where: { id: accountId },
        data: { isActive },
      }),
    ]);
  } else if (hasAccountUpdate) {
    await prisma.account.update({
      where: { id: accountId },
      data: { isActive },
    });
  } else if (hasProfileUpdate) {
    await prisma.profile.update({
      where: { id: accountId },
      data: profileFields,
    });
  }

  // Re-fetch and return the full profile shape
  return findAccountWithProfile(accountId);
}

export async function findAccountById(accountId: string) {
  return prisma.account.findFirst({
    where: { id: accountId },
  });
}

// src/modules/users/repository.ts (additions)

export async function listPermissions() {
  return prisma.permission.findMany({
    orderBy: { id: 'asc' },
  });
}

export async function listRolePermissions(roleId: number) {
  return prisma.rolePermission.findMany({
    where: { roleId },
    include: { permission: true },
    orderBy: { permissionId: 'asc' },
  });
}

export async function assignPermissionToRole(roleId: number, permissionId: number) {
  return prisma.rolePermission.create({
    data: { roleId, permissionId },
  });
}

export async function removePermissionFromRole(roleId: number, permissionId: number) {
  return prisma.rolePermission.delete({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}

// src/modules/users/repository.ts (additions)

export async function findPermissionById(id: number) {
  return prisma.permission.findUnique({ where: { id } });
}

export async function findRolePermission(roleId: number, permissionId: number) {
  return prisma.rolePermission.findUnique({
    where: { roleId_permissionId: { roleId, permissionId } },
  });
}