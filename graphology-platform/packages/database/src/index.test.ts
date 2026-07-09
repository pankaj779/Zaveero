import { describe, expect, it } from 'vitest';
import { prisma } from './index.js';

describe('@graphology/database', () => {
  it('exports a Prisma client instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
  });
});
