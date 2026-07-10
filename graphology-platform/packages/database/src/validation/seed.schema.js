"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedOrganizationSchema = exports.seedSystemSettingSchema = exports.seedPermissionSchema = exports.seedRoleSchema = exports.seedAdminEnvSchema = void 0;
const zod_1 = require("zod");
exports.seedAdminEnvSchema = zod_1.z.object({
    SEED_ADMIN_EMAIL: zod_1.z.string().email(),
    SEED_ADMIN_PASSWORD: zod_1.z.string().min(8),
    SEED_ADMIN_FIRST_NAME: zod_1.z.string().min(1).default('System'),
    SEED_ADMIN_LAST_NAME: zod_1.z.string().min(1).default('Administrator'),
});
exports.seedRoleSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
    isSystem: zod_1.z.boolean().default(true),
});
exports.seedPermissionSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    module: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
exports.seedSystemSettingSchema = zod_1.z.object({
    key: zod_1.z.string().min(1),
    value: zod_1.z.string().min(1),
    description: zod_1.z.string().optional(),
});
exports.seedOrganizationSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    slug: zod_1.z
        .string()
        .min(1)
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase kebab-case'),
    email: zod_1.z.string().email().optional(),
    timezone: zod_1.z.string().min(1).default('Asia/Kolkata'),
    currency: zod_1.z.string().min(1).default('INR'),
    language: zod_1.z.string().min(1).default('en'),
    isActive: zod_1.z.boolean().default(true),
});
//# sourceMappingURL=seed.schema.js.map