import { z } from 'zod';

export const seedAdminEnvSchema = z.object({
  SEED_ADMIN_EMAIL: z.string().email(),
  SEED_ADMIN_PASSWORD: z.string().min(8),
  SEED_ADMIN_FIRST_NAME: z.string().min(1).default('System'),
  SEED_ADMIN_LAST_NAME: z.string().min(1).default('Administrator'),
});

export const seedRoleSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  isSystem: z.boolean().default(true),
});

export const seedPermissionSchema = z.object({
  name: z.string().min(1),
  module: z.string().min(1),
  description: z.string().optional(),
});

export const seedSystemSettingSchema = z.object({
  key: z.string().min(1),
  value: z.string().min(1),
  description: z.string().optional(),
});

export const seedOrganizationSchema = z.object({
  name: z.string().min(1),
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
  email: z.string().email().optional(),
  timezone: z.string().min(1).default('Asia/Kolkata'),
  currency: z.string().min(1).default('INR'),
  language: z.string().min(1).default('en'),
  isActive: z.boolean().default(true),
});

export type SeedAdminEnv = z.infer<typeof seedAdminEnvSchema>;
export type SeedRole = z.infer<typeof seedRoleSchema>;
export type SeedPermission = z.infer<typeof seedPermissionSchema>;
export type SeedSystemSetting = z.infer<typeof seedSystemSettingSchema>;
export type SeedOrganization = z.infer<typeof seedOrganizationSchema>;