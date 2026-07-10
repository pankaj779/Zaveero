import { afterAll, describe, expect, it } from 'vitest';
import { prisma } from './client.js';

const shouldRunDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';

describe.runIf(shouldRunDatabaseTests)('@graphology/database connection', () => {
  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to PostgreSQL successfully', async () => {
    await expect(prisma.$queryRaw`SELECT 1 AS value`).resolves.toEqual([{ value: 1 }]);
  });
});
