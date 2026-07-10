import './load-env.js';
import { hash } from 'argon2';
import {
  seedAdminEnvSchema,
  seedOrganizationSchema,
  seedPermissionSchema,
  seedRoleSchema,
  seedSystemSettingSchema,
} from '../src/validation/seed.schema.js';

const { PrismaClient, OrganizationMemberStatus } = await import('@prisma/client');
const prisma = new PrismaClient();

const ROLES = [
  { name: 'Admin', description: 'Full platform administration access', isSystem: true },
  { name: 'Teacher', description: 'Teaching and batch management access', isSystem: true },
  { name: 'Student', description: 'Student learning portal access', isSystem: true },
  { name: 'Parent', description: 'Parent dashboard access', isSystem: true },
] as const;

const PERMISSIONS = [
  { name: 'course.create', module: 'course', description: 'Create courses' },
  { name: 'course.update', module: 'course', description: 'Update courses' },
  { name: 'student.view', module: 'student', description: 'View student records' },
  { name: 'teacher.update', module: 'teacher', description: 'Update teacher records' },
  { name: 'payment.manage', module: 'payment', description: 'Manage payments' },
] as const;

const SYSTEM_SETTINGS = [
  { key: 'site_name', value: 'Graphology Platform', description: 'Public site name' },
  { key: 'maintenance_mode', value: 'false', description: 'Platform maintenance toggle' },
  { key: 'support_email', value: 'support@graphology.local', description: 'Support contact email' },
  { key: 'timezone', value: 'Asia/Kolkata', description: 'Default platform timezone' },
  { key: 'currency', value: 'INR', description: 'Default platform currency' },
] as const;

const DEFAULT_ORGANIZATION = {
  name: 'Graphology Academy',
  slug: 'graphology-academy',
  email: 'admin@graphology.local',
  timezone: 'Asia/Kolkata',
  currency: 'INR',
  language: 'en',
  isActive: true,
} as const;

async function seedRoles(): Promise<Map<string, string>> {
  const roleIds = new Map<string, string>();

  for (const role of ROLES) {
    const validated = seedRoleSchema.parse(role);
    const record = await prisma.role.upsert({
      where: { name: validated.name },
      update: {
        description: validated.description,
        isSystem: validated.isSystem,
      },
      create: validated,
    });
    roleIds.set(record.name, record.id);
  }

  return roleIds;
}

async function seedPermissions(): Promise<Map<string, string>> {
  const permissionIds = new Map<string, string>();

  for (const permission of PERMISSIONS) {
    const validated = seedPermissionSchema.parse(permission);
    const record = await prisma.permission.upsert({
      where: { name: validated.name },
      update: {
        module: validated.module,
        description: validated.description,
      },
      create: validated,
    });
    permissionIds.set(record.name, record.id);
  }

  return permissionIds;
}

async function seedRolePermissions(
  roleIds: Map<string, string>,
  permissionIds: Map<string, string>,
): Promise<void> {
  const adminRoleId = roleIds.get('Admin');

  if (!adminRoleId) {
    throw new Error('Admin role was not seeded.');
  }

  for (const permissionId of permissionIds.values()) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRoleId,
          permissionId,
        },
      },
      update: {},
      create: {
        roleId: adminRoleId,
        permissionId,
      },
    });
  }
}

async function seedSystemSettings(): Promise<void> {
  for (const setting of SYSTEM_SETTINGS) {
    const validated = seedSystemSettingSchema.parse(setting);
    await prisma.systemSetting.upsert({
      where: { key: validated.key },
      update: {
        value: validated.value,
        description: validated.description,
      },
      create: validated,
    });
  }
}

async function seedDefaultOrganization(): Promise<string> {
  const validated = seedOrganizationSchema.parse(DEFAULT_ORGANIZATION);

  const organization = await prisma.organization.upsert({
    where: { slug: validated.slug },
    update: {
      name: validated.name,
      email: validated.email,
      timezone: validated.timezone,
      currency: validated.currency,
      language: validated.language,
      isActive: validated.isActive,
    },
    create: validated,
  });

  return organization.id;
}

async function seedAdminUser(roleIds: Map<string, string>): Promise<string> {
  const adminEnv = seedAdminEnvSchema.parse({
    SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
    SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
    SEED_ADMIN_FIRST_NAME: process.env.SEED_ADMIN_FIRST_NAME ?? 'System',
    SEED_ADMIN_LAST_NAME: process.env.SEED_ADMIN_LAST_NAME ?? 'Administrator',
  });

  const passwordHash = await hash(adminEnv.SEED_ADMIN_PASSWORD);

  const adminUser = await prisma.user.upsert({
    where: { email: adminEnv.SEED_ADMIN_EMAIL },
    update: {
      firstName: adminEnv.SEED_ADMIN_FIRST_NAME,
      lastName: adminEnv.SEED_ADMIN_LAST_NAME,
      passwordHash,
      emailVerified: true,
      isActive: true,
    },
    create: {
      firstName: adminEnv.SEED_ADMIN_FIRST_NAME,
      lastName: adminEnv.SEED_ADMIN_LAST_NAME,
      email: adminEnv.SEED_ADMIN_EMAIL,
      passwordHash,
      emailVerified: true,
      isActive: true,
    },
  });

  const adminRoleId = roleIds.get('Admin');

  if (!adminRoleId) {
    throw new Error('Admin role was not seeded.');
  }

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: adminUser.id,
        roleId: adminRoleId,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      roleId: adminRoleId,
    },
  });

  return adminUser.id;
}

async function seedOrganizationMembership(
  organizationId: string,
  userId: string,
): Promise<void> {
  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId,
        userId,
      },
    },
    update: {
      status: OrganizationMemberStatus.ACTIVE,
    },
    create: {
      organizationId,
      userId,
      status: OrganizationMemberStatus.ACTIVE,
    },
  });
}

async function main(): Promise<void> {
  const roleIds = await seedRoles();
  const permissionIds = await seedPermissions();
  await seedRolePermissions(roleIds, permissionIds);
  await seedSystemSettings();
  const organizationId = await seedDefaultOrganization();
  const adminUserId = await seedAdminUser(roleIds);
  await seedOrganizationMembership(organizationId, adminUserId);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error('Database seed failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  });
