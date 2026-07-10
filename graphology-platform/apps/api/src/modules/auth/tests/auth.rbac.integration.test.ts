import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash } from 'argon2';
import { prisma } from '@graphology/database';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import {
  AUTH_PERMISSIONS,
  AUTH_ROLES,
  AUTH_TOKEN_TYPES,
  DEFAULT_ORGANIZATION,
} from '../constants/auth.constants';
import {
  AccountDisabledException,
  InsufficientPermissionsException,
  InsufficientRolesException,
  OrganizationMembershipRequiredException,
  TokenExpiredException,
  TokenInvalidException,
  UnauthenticatedException,
} from '../exceptions';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PrismaAuthorizationRepository } from '../repositories/prisma-authorization.repository';
import { PermissionLookupService } from '../services/permission-lookup.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

const shouldRunDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';

describe.runIf(shouldRunDatabaseTests)('RBAC authorization integration', () => {
  const jwtSecret = process.env.JWT_SECRET ?? 'test-jwt-secret';
  const jwtService = new JwtService({ secret: jwtSecret });
  const authorizationRepository = new PrismaAuthorizationRepository(prisma);
  const permissionLookupService = new PermissionLookupService(authorizationRepository);
  const jwtGuard = new JwtAuthGuard(jwtService, permissionLookupService);
  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector, permissionLookupService);
  const permissionsGuard = new PermissionsGuard(reflector, permissionLookupService);

  const suffix = Date.now().toString();
  const createdUserIds: string[] = [];
  let organizationId: string;
  let studentUserId: string;
  let teacherUserId: string;
  let adminUserId: string;
  let studentToken: string;
  let teacherToken: string;
  let adminToken: string;

  function createContext(request: Partial<AuthenticatedRequest>, metadata?: {
    roles?: string[];
    permissions?: string[];
  }) {
    const handler = () => undefined;
    if (metadata?.roles) {
      Reflect.defineMetadata('roles', metadata.roles, handler);
    }
    if (metadata?.permissions) {
      Reflect.defineMetadata('permissions', metadata.permissions, handler);
    }

    return {
      switchToHttp: () => ({
        getRequest: () => request,
      }),
      getHandler: () => handler,
      getClass: () => ({}),
    } as never;
  }

  async function createUser(input: {
    email: string;
    roleName: string;
    withPermissions?: boolean;
  }): Promise<string> {
    const passwordHash = await hash('SecurePass1!');
    const user = await prisma.user.create({
      data: {
        firstName: 'Rbac',
        lastName: input.roleName,
        email: input.email,
        passwordHash,
        emailVerified: true,
        isActive: true,
      },
    });

    createdUserIds.push(user.id);

    const role = await prisma.role.findUniqueOrThrow({ where: { name: input.roleName } });
    await prisma.userRole.create({
      data: { userId: user.id, roleId: role.id },
    });

    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId,
        status: 'ACTIVE',
      },
    });

    if (input.withPermissions) {
      const permission = await prisma.permission.findUniqueOrThrow({
        where: { name: AUTH_PERMISSIONS.studentView },
      });
      await prisma.rolePermission.upsert({
        where: {
          roleId_permissionId: {
            roleId: role.id,
            permissionId: permission.id,
          },
        },
        create: {
          roleId: role.id,
          permissionId: permission.id,
        },
        update: {},
      });
    }

    return user.id;
  }

  async function issueToken(
    userId: string,
    email: string,
    expiresIn: number | `${number}${'s' | 'm' | 'h' | 'd'}` = '15m',
  ): Promise<string> {
    return jwtService.signAsync(
      {
        sub: userId,
        email,
        type: AUTH_TOKEN_TYPES.access,
      },
      { secret: jwtSecret, expiresIn },
    );
  }

  beforeAll(async () => {
    await prisma.$connect();

    const organization = await prisma.organization.findUniqueOrThrow({
      where: { slug: DEFAULT_ORGANIZATION.slug },
    });
    organizationId = organization.id;

    studentUserId = await createUser({
      email: `rbac-student-${suffix}@example.com`,
      roleName: AUTH_ROLES.student,
    });
    teacherUserId = await createUser({
      email: `rbac-teacher-${suffix}@example.com`,
      roleName: AUTH_ROLES.teacher,
    });
    adminUserId = await createUser({
      email: `rbac-admin-${suffix}@example.com`,
      roleName: AUTH_ROLES.admin,
    });

    studentToken = await issueToken(studentUserId, `rbac-student-${suffix}@example.com`);
    teacherToken = await issueToken(teacherUserId, `rbac-teacher-${suffix}@example.com`);
    adminToken = await issueToken(adminUserId, `rbac-admin-${suffix}@example.com`);
  });

  afterAll(async () => {
    if (createdUserIds.length > 0) {
      await prisma.userRole.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.organizationMember.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.refreshToken.deleteMany({ where: { userId: { in: createdUserIds } } });
      await prisma.user.deleteMany({ where: { id: { in: createdUserIds } } });
    }
    await prisma.$disconnect();
  });

  it('authenticates a valid JWT and loads roles/permissions from the database', async () => {
    const request: Partial<AuthenticatedRequest> = {
      headers: { authorization: `Bearer ${adminToken}` },
    };

    await expect(jwtGuard.canActivate(createContext(request))).resolves.toBe(true);
    expect(request.user?.roles).toContain(AUTH_ROLES.admin);
    expect(request.user?.permissions).toContain(AUTH_PERMISSIONS.studentView);
    expect(request.user?.organizationIds).toContain(organizationId);
  });

  it('rejects missing, invalid, and expired JWTs', async () => {
    await expect(
      jwtGuard.canActivate(createContext({ headers: {} })),
    ).rejects.toBeInstanceOf(UnauthenticatedException);

    await expect(
      jwtGuard.canActivate(
        createContext({ headers: { authorization: 'Bearer not-a-jwt' } }),
      ),
    ).rejects.toBeInstanceOf(TokenInvalidException);

    const expired = await issueToken(studentUserId, `rbac-student-${suffix}@example.com`, -10);
    await expect(
      jwtGuard.canActivate(createContext({ headers: { authorization: `Bearer ${expired}` } })),
    ).rejects.toBeInstanceOf(TokenExpiredException);
  });

  it('enforces Admin, Teacher, and Student role access', () => {
    const adminRequest = {
      user: {
        id: adminUserId,
        email: `rbac-admin-${suffix}@example.com`,
        roles: [AUTH_ROLES.admin],
        permissions: [],
        organizationIds: [organizationId],
      } satisfies AuthenticatedUser,
    };
    const teacherRequest = {
      user: {
        id: teacherUserId,
        email: `rbac-teacher-${suffix}@example.com`,
        roles: [AUTH_ROLES.teacher],
        permissions: [],
        organizationIds: [organizationId],
      } satisfies AuthenticatedUser,
    };
    const studentRequest = {
      user: {
        id: studentUserId,
        email: `rbac-student-${suffix}@example.com`,
        roles: [AUTH_ROLES.student],
        permissions: [],
        organizationIds: [organizationId],
      } satisfies AuthenticatedUser,
    };

    expect(
      rolesGuard.canActivate(createContext(adminRequest, { roles: [AUTH_ROLES.admin] })),
    ).toBe(true);
    expect(
      rolesGuard.canActivate(
        createContext(teacherRequest, { roles: [AUTH_ROLES.teacher, AUTH_ROLES.admin] }),
      ),
    ).toBe(true);
    expect(
      rolesGuard.canActivate(createContext(studentRequest, { roles: [AUTH_ROLES.student] })),
    ).toBe(true);
    expect(() =>
      rolesGuard.canActivate(createContext(studentRequest, { roles: [AUTH_ROLES.admin] })),
    ).toThrow(InsufficientRolesException);
  });

  it('enforces permission checks from repository-backed lookup', async () => {
    const adminRequest: Partial<AuthenticatedRequest> = {
      headers: { authorization: `Bearer ${adminToken}` },
    };
    await jwtGuard.canActivate(createContext(adminRequest));

    await expect(
      permissionsGuard.canActivate(
        createContext(adminRequest, { permissions: [AUTH_PERMISSIONS.studentView] }),
      ),
    ).resolves.toBe(true);

    const studentRequest: Partial<AuthenticatedRequest> = {
      headers: { authorization: `Bearer ${studentToken}` },
    };
    await jwtGuard.canActivate(createContext(studentRequest));

    await expect(
      permissionsGuard.canActivate(
        createContext(studentRequest, { permissions: [AUTH_PERMISSIONS.courseCreate] }),
      ),
    ).rejects.toBeInstanceOf(InsufficientPermissionsException);
  });

  it('rejects disabled and soft-deleted users', async () => {
    await prisma.user.update({
      where: { id: teacherUserId },
      data: { isActive: false },
    });

    await expect(
      jwtGuard.canActivate(
        createContext({ headers: { authorization: `Bearer ${teacherToken}` } }),
      ),
    ).rejects.toBeInstanceOf(AccountDisabledException);

    await prisma.user.update({
      where: { id: teacherUserId },
      data: { isActive: true, deletedAt: new Date() },
    });

    await expect(
      jwtGuard.canActivate(
        createContext({ headers: { authorization: `Bearer ${teacherToken}` } }),
      ),
    ).rejects.toBeInstanceOf(AccountDisabledException);

    await prisma.user.update({
      where: { id: teacherUserId },
      data: { deletedAt: null },
    });
  });

  it('rejects inactive organization membership', async () => {
    await prisma.organizationMember.updateMany({
      where: { userId: studentUserId },
      data: { status: 'SUSPENDED' },
    });

    await expect(
      jwtGuard.canActivate(
        createContext({ headers: { authorization: `Bearer ${studentToken}` } }),
      ),
    ).rejects.toBeInstanceOf(OrganizationMembershipRequiredException);

    await prisma.organizationMember.updateMany({
      where: { userId: studentUserId },
      data: { status: 'ACTIVE' },
    });
  });
});
