import { execSync } from 'child_process';
import * as dotenv from 'dotenv';

export default async function globalSetup() {
  dotenv.config({ path: '.env.test' });
  // Push the Prisma schema to the test database (creates all tables)
  execSync('npx prisma db push --skip-generate', {
    env: { ...process.env, DATABASE_URL: process.env.DATABASE_URL },
    stdio: 'inherit',
  });
}