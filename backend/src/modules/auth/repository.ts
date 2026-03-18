import prisma from '../../config/prisma';
import { RegisterDTO } from './types';

export async function createAccount(data: RegisterDTO, hashedPassword: string) {
  return prisma.$transaction(async (tx) => {
    const account = await tx.account.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash: hashedPassword,
      },
    });

    await tx.profile.create({
      data: {
        id: account.id,
        fullName: data.full_name,
      },
    });

    return account;
  });
}

export async function findAccountByEmail(email: string) {
  return prisma.account.findUnique({
    where: { email: email.toLowerCase() },
  });
}

export async function createSession(
  accountId: string,
  tokenHash: string,
  expiresAt: Date,
  userAgent?: string,
  ipAddress?: string
) {
  return prisma.session.create({
    data: {
      accountId,
      refreshToken: tokenHash,
      expiresAt,
      userAgent: userAgent ?? null,
      ipAddress: ipAddress ?? null,
    },
  });
}

export async function findSessionByTokenHash(tokenHash: string) {
  return prisma.session.findUnique({
    where: { refreshToken: tokenHash },
  });
}

export async function deleteSession(sessionId: string) {
  return prisma.session.delete({
    where: { id: sessionId },
  });
}

export async function updateSessionToken(
  sessionId: string,
  newTokenHash: string,
  newExpiresAt: Date
) {
  return prisma.session.update({
    where: { id: sessionId },
    data: {
      refreshToken: newTokenHash,
      expiresAt: newExpiresAt,
    },
  });
}

export async function createEmailVerificationToken(
  accountId: string,
  tokenHash: string,
  expiresAt: Date
) {
  return prisma.emailVerificationToken.create({
    data: {
      account_id: accountId,
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  });
}

export async function findEmailVerificationToken(tokenHash: string) {
  return prisma.emailVerificationToken.findUnique({
    where: { token_hash: tokenHash },
  });
}

export async function markEmailVerificationTokenUsed(tokenId: string) {
  return prisma.emailVerificationToken.update({
    where: { id: tokenId },
    data: { used_at: new Date() },
  });
}

export async function markAccountVerified(accountId: string) {
  return prisma.account.update({
    where: { id: accountId },
    data: { isVerified: true },
  });
}

export async function findAccountById(id: string) {
  return prisma.account.findUnique({
    where: { id },
  });
}

export async function findAccountWithPermissions(id: string) {
  const account = await prisma.account.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      isActive: true,
      accountRoles: {
        select: {
          role: {
            select: {
              name: true,
              rolePermissions: {
                select: {
                  permission: {
                    select: {
                      code: true,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!account) return null;

  return {
    id: account.id,
    email: account.email,
    isActive: account.isActive,
    roles: account.accountRoles.map((ar) => ar.role.name),
    permissions: account.accountRoles.flatMap((ar) =>
      ar.role.rolePermissions.map((rp) => rp.permission.code)
    ),
  };
}

export async function createPasswordResetToken(
  accountId: string,
  tokenHash: string,
  expiresAt: Date
) {
  return prisma.passwordResetToken.create({
    data: {
      accountId: accountId,
      tokenHash: tokenHash,
      expiresAt: expiresAt,
    },
  });
}

export async function findPasswordResetToken(tokenHash: string) {
  return prisma.passwordResetToken.findUnique({
    where: { tokenHash: tokenHash },
  });
}

export async function markPasswordResetTokenUsed(tokenId: string) {
  return prisma.passwordResetToken.update({
    where: { id: tokenId },
    data: { usedAt: new Date() },
  });
}

export async function updatePasswordHash(
  accountId: string,
  newPasswordHash: string
) {
  return prisma.account.update({
    where: { id: accountId },
    data: { passwordHash: newPasswordHash },
  });
}

export async function findAccountByProvider(
  provider: string,
  providerUid: string
) {
  return prisma.oAuthProvider.findUnique({
    where: {
      provider_providerUid: {
        provider,
        providerUid,
      },
    },
    include: {
      account: true,
    },
  });
}

export async function findOrCreateOAuthAccount(
  provider: string,
  providerUid: string,
  email: string,
  fullName: string
) {
  const existing = await findAccountByProvider(provider, providerUid);
  if (existing) return { account: existing.account, created: false, conflict: false };

  const emailConflict = await prisma.account.findUnique({
    where: { email },
  });

  if (emailConflict) {
    return { account: null, created: false, conflict: true };
  }

  const account = await prisma.$transaction(async (tx) => {
    const newAccount = await tx.account.create({
      data: {
        email: email.toLowerCase(),
        isVerified: true,
        oauthProviders: {
          create: {
            provider,
            providerUid,
          },
        },
      },
    });

    await tx.profile.create({
      data: {
        id: newAccount.id,
        fullName,
      },
    });

    const employeeRole = await tx.role.findUnique({
      where: { name: 'employee' },
    });

    if (employeeRole) {
      await tx.accountRole.create({
        data: {
          accountId: newAccount.id,
          roleId: employeeRole.id,
        },
      });
    }

    return newAccount;
  });

  return { account, created: true, conflict: false };
}

export async function findSessionsByAccountId(accountId: string) {
  return prisma.session.findMany({
    where: { accountId },
    orderBy: { createdAt: 'desc' },
  });
}

export async function findSessionById(sessionId: string) {
  return prisma.session.findUnique({
    where: { id: sessionId },
  });
}