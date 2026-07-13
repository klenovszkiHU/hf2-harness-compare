import { PrismaClient } from '@prisma/client';

export function createTestPrismaClient(): PrismaClient {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      'TEST_DATABASE_URL is not set. Copy .env.example to .env and run `npm run db:up` first.'
    );
  }
  return new PrismaClient({ datasources: { db: { url } } });
}
