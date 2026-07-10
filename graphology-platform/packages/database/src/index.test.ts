import { describe, expect, it } from 'vitest';
import { prisma } from './client.js';
import {
  seedAdminEnvSchema,
  seedOrganizationSchema,
  seedPermissionSchema,
  seedRoleSchema,
  seedSystemSettingSchema,
} from './validation/seed.schema.js';

describe('@graphology/database client', () => {
  it('exports a Prisma client instance', () => {
    expect(prisma).toBeDefined();
    expect(typeof prisma.$connect).toBe('function');
  });
});

describe('@graphology/database seed validation', () => {
  it('validates admin seed environment variables', () => {
    const result = seedAdminEnvSchema.parse({
      SEED_ADMIN_EMAIL: 'admin@graphology.local',
      SEED_ADMIN_PASSWORD: 'SecurePass1!',
      SEED_ADMIN_FIRST_NAME: 'System',
      SEED_ADMIN_LAST_NAME: 'Administrator',
    });

    expect(result.SEED_ADMIN_EMAIL).toBe('admin@graphology.local');
  });

  it('rejects invalid admin seed environment variables', () => {
    expect(() =>
      seedAdminEnvSchema.parse({
        SEED_ADMIN_EMAIL: 'not-an-email',
        SEED_ADMIN_PASSWORD: 'short',
      }),
    ).toThrow();
  });

  it('validates role, permission, system setting, and organization payloads', () => {
    expect(seedRoleSchema.parse({ name: 'Admin', description: 'Admin role' }).name).toBe('Admin');
    expect(seedPermissionSchema.parse({ name: 'course.create', module: 'course' }).module).toBe(
      'course',
    );
    expect(seedSystemSettingSchema.parse({ key: 'site_name', value: 'Graphology Platform' }).key).toBe(
      'site_name',
    );
    expect(
      seedOrganizationSchema.parse({
        name: 'Graphology Academy',
        slug: 'graphology-academy',
      }).slug,
    ).toBe('graphology-academy');
  });

  it('rejects invalid organization slugs', () => {
    expect(() =>
      seedOrganizationSchema.parse({
        name: 'Graphology Academy',
        slug: 'Invalid Slug',
      }),
    ).toThrow();
  });
});
