// scripts/seed-admin.ts

import 'dotenv/config';
import { PrismaClient } from '../src/generated/prisma';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const EMAIL = process.env.SEED_ADMIN_EMAIL!;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD!;

if (!EMAIL || !PASSWORD) {
  console.error('SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set in environment.');
  process.exit(1);
}

const FULL_NAME = 'Admin';
const BCRYPT_SALT_ROUNDS = parseInt(process.env.BCRYPT_SALT_ROUNDS || '12', 10);

console.log('Running seed for:', EMAIL);

async function seed() {
  try {
    // 1. Check/create account
    let account = await prisma.account.findUnique({
      where: { email: EMAIL },
    });

    console.log('Account lookup result:', JSON.stringify(account));

    if (!account) {
      const passwordHash = await bcrypt.hash(PASSWORD, BCRYPT_SALT_ROUNDS);
      account = await prisma.account.create({
        data: {
          email: EMAIL,
          passwordHash,
          isVerified: true,
          isActive: true,
          profile: {
            create: {
              fullName: FULL_NAME,
            },
          },
        },
      });
      console.log(`Created account: ${EMAIL} (${account.id})`);
    } else {
      console.log(`Account already exists: ${EMAIL} (${account.id})`);
    }

    // 2. Check admin role exists
    const adminRole = await prisma.role.findFirst({
      where: { name: 'admin' },
    });

    if (!adminRole) {
      throw new Error('Admin role not found in users.roles. Has the migration seed run?');
    }

    // 3. Check/create role assignment
    const existingRoleAssignment = await prisma.accountRole.findUnique({
      where: {
        accountId_roleId: {
          accountId: account.id,
          roleId: adminRole.id,
        },
      },
    });

    if (!existingRoleAssignment) {
      await prisma.accountRole.create({
        data: {
          accountId: account.id,
          roleId: adminRole.id,
        },
      });
      console.log(`Assigned admin role (id: ${adminRole.id}) to account`);
    } else {
      console.log(`Admin role already assigned. Nothing to do.`);
    }

    console.log('Seed complete.');
  } catch (err) {
    console.error('Seed failed:', (err as Error).message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

seed().catch((err) => {
  console.error('Unhandled error:', (err as Error).message);
  process.exit(1);
});