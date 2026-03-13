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