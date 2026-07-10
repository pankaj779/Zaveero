import { z } from 'zod';
export declare const seedAdminEnvSchema: z.ZodObject<{
    SEED_ADMIN_EMAIL: z.ZodString;
    SEED_ADMIN_PASSWORD: z.ZodString;
    SEED_ADMIN_FIRST_NAME: z.ZodDefault<z.ZodString>;
    SEED_ADMIN_LAST_NAME: z.ZodDefault<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    SEED_ADMIN_EMAIL: string;
    SEED_ADMIN_PASSWORD: string;
    SEED_ADMIN_FIRST_NAME: string;
    SEED_ADMIN_LAST_NAME: string;
}, {
    SEED_ADMIN_EMAIL: string;
    SEED_ADMIN_PASSWORD: string;
    SEED_ADMIN_FIRST_NAME?: string | undefined;
    SEED_ADMIN_LAST_NAME?: string | undefined;
}>;
export declare const seedRoleSchema: z.ZodObject<{
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    isSystem: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isSystem: boolean;
    description?: string | undefined;
}, {
    name: string;
    description?: string | undefined;
    isSystem?: boolean | undefined;
}>;
export declare const seedPermissionSchema: z.ZodObject<{
    name: z.ZodString;
    module: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    name: string;
    module: string;
    description?: string | undefined;
}, {
    name: string;
    module: string;
    description?: string | undefined;
}>;
export declare const seedSystemSettingSchema: z.ZodObject<{
    key: z.ZodString;
    value: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    value: string;
    key: string;
    description?: string | undefined;
}, {
    value: string;
    key: string;
    description?: string | undefined;
}>;
export declare const seedOrganizationSchema: z.ZodObject<{
    name: z.ZodString;
    slug: z.ZodString;
    email: z.ZodOptional<z.ZodString>;
    timezone: z.ZodDefault<z.ZodString>;
    currency: z.ZodDefault<z.ZodString>;
    language: z.ZodDefault<z.ZodString>;
    isActive: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    name: string;
    isActive: boolean;
    slug: string;
    timezone: string;
    currency: string;
    language: string;
    email?: string | undefined;
}, {
    name: string;
    slug: string;
    email?: string | undefined;
    isActive?: boolean | undefined;
    timezone?: string | undefined;
    currency?: string | undefined;
    language?: string | undefined;
}>;
export type SeedAdminEnv = z.infer<typeof seedAdminEnvSchema>;
export type SeedRole = z.infer<typeof seedRoleSchema>;
export type SeedPermission = z.infer<typeof seedPermissionSchema>;
export type SeedSystemSetting = z.infer<typeof seedSystemSettingSchema>;
export type SeedOrganization = z.infer<typeof seedOrganizationSchema>;
//# sourceMappingURL=seed.schema.d.ts.map