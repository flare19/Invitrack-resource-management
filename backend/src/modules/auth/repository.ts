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