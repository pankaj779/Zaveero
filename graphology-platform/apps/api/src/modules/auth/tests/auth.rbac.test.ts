import { describe, expect, it, vi, beforeEach } from 'vitest';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import { AUTH_PERMISSIONS, AUTH_ROLES, AUTH_TOKEN_TYPES } from '../constants/auth.constants';
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
import type { UserAuthorizationContext } from '../interfaces/authorization-repository.interface';
import type { PermissionLookupService } from '../services/permission-lookup.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

function createExecutionContext(request: Partial<AuthenticatedRequest>) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as never;
}

function createContext(overrides: Partial<UserAuthorizationContext> = {}): UserAuthorizationContext {
  return {
    userId: 'user-1',
    email: 'ada@example.com',
    isActive: true,
    deletedAt: null,
    roles: [AUTH_ROLES.admin],
    permissions: [AUTH_PERMISSIONS.studentView],
    activeOrganizationIds: ['org-1'],
    ...overrides,
  };
}

describe('RBAC guards', () => {
  const verifyAsync = vi.fn();
  const getAuthorizationContext = vi.fn();
  const getPermissionsForUser = vi.fn();

  const jwtService = { verifyAsync } as unknown as JwtService;
  const permissionLookupService = {
    getAuthorizationContext,
    getPermissionsForUser,
    hasAnyRole: (userRoles: readonly string[], required: readonly string[]) =>
      required.some((role) => userRoles.includes(role)),
    hasAllPermissions: (userPerms: readonly string[], required: readonly string[]) =>
      required.every((permission) => userPerms.includes(permission)),
  } as unknown as PermissionLookupService;

  const jwtGuard = new JwtAuthGuard(jwtService, permissionLookupService);
  const reflector = new Reflector();
  const rolesGuard = new RolesGuard(reflector, permissionLookupService);
  const permissionsGuard = new PermissionsGuard(reflector, permissionLookupService);

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('JwtAuthGuard', () => {
    it('accepts a valid JWT and attaches the authenticated user', async () => {
      const request: Partial<AuthenticatedRequest> = {
        headers: { authorization: 'Bearer valid-token' },
      };
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ada@example.com',
        type: AUTH_TOKEN_TYPES.access,
      });
      getAuthorizationContext.mockResolvedValue(createContext());

      await expect(jwtGuard.canActivate(createExecutionContext(request))).resolves.toBe(true);
      expect(request.user).toEqual({
        id: 'user-1',
        email: 'ada@example.com',
        roles: [AUTH_ROLES.admin],
        permissions: [AUTH_PERMISSIONS.studentView],
        organizationIds: ['org-1'],
      });
    });

    it('rejects missing JWT', async () => {
      await expect(
        jwtGuard.canActivate(createExecutionContext({ headers: {} })),
      ).rejects.toBeInstanceOf(UnauthenticatedException);
    });

    it('rejects invalid JWT', async () => {
      verifyAsync.mockRejectedValue(new Error('invalid signature'));

      await expect(
        jwtGuard.canActivate(
          createExecutionContext({ headers: { authorization: 'Bearer bad' } }),
        ),
      ).rejects.toBeInstanceOf(TokenInvalidException);
    });

    it('rejects expired JWT', async () => {
      const expired = new Error('jwt expired');
      expired.name = 'TokenExpiredError';
      verifyAsync.mockRejectedValue(expired);

      await expect(
        jwtGuard.canActivate(
          createExecutionContext({ headers: { authorization: 'Bearer expired' } }),
        ),
      ).rejects.toBeInstanceOf(TokenExpiredException);
    });

    it('rejects disabled users', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ada@example.com',
        type: AUTH_TOKEN_TYPES.access,
      });
      getAuthorizationContext.mockResolvedValue(createContext({ isActive: false }));

      await expect(
        jwtGuard.canActivate(
          createExecutionContext({ headers: { authorization: 'Bearer valid-token' } }),
        ),
      ).rejects.toBeInstanceOf(AccountDisabledException);
    });

    it('rejects soft-deleted users', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ada@example.com',
        type: AUTH_TOKEN_TYPES.access,
      });
      getAuthorizationContext.mockResolvedValue(
        createContext({ deletedAt: new Date('2026-01-01') }),
      );

      await expect(
        jwtGuard.canActivate(
          createExecutionContext({ headers: { authorization: 'Bearer valid-token' } }),
        ),
      ).rejects.toBeInstanceOf(AccountDisabledException);
    });

    it('rejects users without an active organization membership', async () => {
      verifyAsync.mockResolvedValue({
        sub: 'user-1',
        email: 'ada@example.com',
        type: AUTH_TOKEN_TYPES.access,
      });
      getAuthorizationContext.mockResolvedValue(createContext({ activeOrganizationIds: [] }));

      await expect(
        jwtGuard.canActivate(
          createExecutionContext({ headers: { authorization: 'Bearer valid-token' } }),
        ),
      ).rejects.toBeInstanceOf(OrganizationMembershipRequiredException);
    });
  });

  describe('RolesGuard', () => {
    it('allows Admin on admin-only routes', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_ROLES.admin]);
      const request = {
        user: {
          id: 'user-1',
          email: 'a@example.com',
          roles: [AUTH_ROLES.admin],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      expect(rolesGuard.canActivate(createExecutionContext(request))).toBe(true);
    });

    it('allows Teacher or Admin on teacher routes', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([
        AUTH_ROLES.teacher,
        AUTH_ROLES.admin,
      ]);
      const request = {
        user: {
          id: 'user-1',
          email: 't@example.com',
          roles: [AUTH_ROLES.teacher],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      expect(rolesGuard.canActivate(createExecutionContext(request))).toBe(true);
    });

    it('allows Student on student routes', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_ROLES.student]);
      const request = {
        user: {
          id: 'user-1',
          email: 's@example.com',
          roles: [AUTH_ROLES.student],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      expect(rolesGuard.canActivate(createExecutionContext(request))).toBe(true);
    });

    it('rejects missing role', () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_ROLES.admin]);
      const request = {
        user: {
          id: 'user-1',
          email: 's@example.com',
          roles: [AUTH_ROLES.student],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      expect(() => rolesGuard.canActivate(createExecutionContext(request))).toThrow(
        InsufficientRolesException,
      );
    });
  });

  describe('PermissionsGuard', () => {
    it('allows when the user has the required permission', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_PERMISSIONS.studentView]);
      getPermissionsForUser.mockResolvedValue([AUTH_PERMISSIONS.studentView]);
      const request = {
        user: {
          id: 'user-1',
          email: 'a@example.com',
          roles: [AUTH_ROLES.admin],
          permissions: [AUTH_PERMISSIONS.studentView],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      await expect(
        permissionsGuard.canActivate(createExecutionContext(request)),
      ).resolves.toBe(true);
      expect(getPermissionsForUser).toHaveBeenCalledWith('user-1');
    });

    it('rejects when the required permission is missing', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_PERMISSIONS.courseCreate]);
      getPermissionsForUser.mockResolvedValue([]);
      const request = {
        user: {
          id: 'user-1',
          email: 's@example.com',
          roles: [AUTH_ROLES.student],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      await expect(
        permissionsGuard.canActivate(createExecutionContext(request)),
      ).rejects.toBeInstanceOf(InsufficientPermissionsException);
    });

    it('loads permissions from the lookup service for every check', async () => {
      vi.spyOn(reflector, 'getAllAndOverride').mockReturnValue([AUTH_PERMISSIONS.studentView]);
      getPermissionsForUser.mockResolvedValue([AUTH_PERMISSIONS.studentView]);
      const request = {
        user: {
          id: 'user-1',
          email: 'a@example.com',
          roles: [AUTH_ROLES.admin],
          permissions: [],
          organizationIds: ['org-1'],
        } satisfies AuthenticatedUser,
      };

      await expect(
        permissionsGuard.canActivate(createExecutionContext(request)),
      ).resolves.toBe(true);
      expect(getPermissionsForUser).toHaveBeenCalledWith('user-1');
    });
  });
});
