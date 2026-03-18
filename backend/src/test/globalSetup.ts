import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';

export default async function globalSetup() {
  dotenv.config({ path: '.env.test' });

  // Push schema to test database
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  });

  // Seed roles and permissions required by auth flows
  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL! } },
  });

  await prisma.$connect();

  // Upsert roles so re-runs don't fail on duplicate
  await prisma.role.upsert({
    where: { name: 'admin' },
    update: {},
    create: { name: 'admin', description: 'Administrator', priority: 100 },
  });
  await prisma.role.upsert({
    where: { name: 'manager' },
    update: {},
    create: { name: 'manager', description: 'Manager', priority: 50 },
  });
  await prisma.role.upsert({
    where: { name: 'employee' },
    update: {},
    create: { name: 'employee', description: 'Employee', priority: 10 },
  });

  await prisma.$disconnect();
}