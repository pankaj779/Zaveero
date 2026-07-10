import { describe, expect, it } from 'vitest';
import { AUTH_PERMISSIONS, AUTH_ROLES } from '../constants/auth.constants';
import { PermissionLookupService } from '../services/permission-lookup.service';
import type { AuthorizationRepository } from '../interfaces/authorization-repository.interface';
import { extractBearerToken } from '../utils/bearer-token.util';

describe('PermissionLookupService', () => {
  const repository: AuthorizationRepository = {
    marker: 'authorization-repository',
    findAuthorizationContext: () =>
      Promise.resolve({
        userId: 'user-1',
        email: 'ada@example.com',
        isActive: true,
        deletedAt: null,
        roles: [AUTH_ROLES.admin],
        permissions: [AUTH_PERMISSIONS.studentView, AUTH_PERMISSIONS.courseCreate],
        activeOrganizationIds: ['org-1'],
      }),
    findPermissionsForUser: () =>
      Promise.resolve([AUTH_PERMISSIONS.studentView, AUTH_PERMISSIONS.courseCreate]),
    findRolesForUser: () => Promise.resolve([AUTH_ROLES.admin]),
  };

  const service = new PermissionLookupService(repository);

  it('loads authorization context through the repository', async () => {
    const context = await service.getAuthorizationContext('user-1');
    expect(context?.roles).toEqual([AUTH_ROLES.admin]);
    expect(context?.permissions).toContain(AUTH_PERMISSIONS.studentView);
  });

  it('evaluates role and permission membership helpers', () => {
    expect(service.hasAnyRole([AUTH_ROLES.teacher], [AUTH_ROLES.teacher, AUTH_ROLES.admin])).toBe(
      true,
    );
    expect(service.hasAnyRole([AUTH_ROLES.student], [AUTH_ROLES.admin])).toBe(false);
    expect(
      service.hasAllPermissions(
        [AUTH_PERMISSIONS.studentView, AUTH_PERMISSIONS.courseCreate],
        [AUTH_PERMISSIONS.studentView],
      ),
    ).toBe(true);
    expect(
      service.hasAllPermissions([AUTH_PERMISSIONS.studentView], [AUTH_PERMISSIONS.courseCreate]),
    ).toBe(false);
  });
});

describe('extractBearerToken', () => {
  it('parses valid Bearer tokens and rejects malformed headers', () => {
    expect(extractBearerToken('Bearer abc.def.ghi')).toBe('abc.def.ghi');
    expect(extractBearerToken('bearer abc')).toBe('abc');
    expect(extractBearerToken(undefined)).toBeNull();
    expect(extractBearerToken('Basic abc')).toBeNull();
    expect(extractBearerToken('Bearer')).toBeNull();
  });
});
