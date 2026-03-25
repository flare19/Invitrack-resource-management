import { PrismaClient } from '../generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

const prisma = new PrismaClient();

beforeAll(async () => {
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});

// Truncate all auth-related tables before each test to ensure isolation
beforeEach(async () => {
  // Order matters — delete dependents before parents
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE
    auth.email_verification_tokens,
    auth.password_reset_tokens,
    auth.sessions,
    auth.oauth_providers,
    users.role_permissions,
    users.permissions,
    users.account_roles,
    users.profiles,
    auth.accounts
    RESTART IDENTITY CASCADE`);
});