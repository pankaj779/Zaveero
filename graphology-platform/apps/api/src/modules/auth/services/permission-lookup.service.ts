import { Inject, Injectable } from '@nestjs/common';
import { AUTHORIZATION_REPOSITORY } from '../constants/injection-tokens';
import type { AuthPermissionName, AuthRoleName } from '../constants/auth.constants';
import type {
  AuthorizationRepository,
  UserAuthorizationContext,
} from '../interfaces/authorization-repository.interface';

/**
 * Loads roles and permissions for authorization decisions.
 * Always goes through the authorization repository — never Prisma.
 */
@Injectable()
export class PermissionLookupService {
  constructor(
    @Inject(AUTHORIZATION_REPOSITORY)
    private readonly authorizationRepository: AuthorizationRepository,
  ) {}

  getAuthorizationContext(userId: string): Promise<UserAuthorizationContext | null> {
    return this.authorizationRepository.findAuthorizationContext(userId);
  }

  getPermissionsForUser(userId: string): Promise<AuthPermissionName[]> {
    return this.authorizationRepository.findPermissionsForUser(userId);
  }

  getRolesForUser(userId: string): Promise<AuthRoleName[]> {
    return this.authorizationRepository.findRolesForUser(userId);
  }

  hasAnyRole(userRoles: readonly string[], requiredRoles: readonly string[]): boolean {
    if (requiredRoles.length === 0) {
      return true;
    }
    const roleSet = new Set(userRoles);
    return requiredRoles.some((role) => roleSet.has(role));
  }

  hasAllPermissions(
    userPermissions: readonly string[],
    requiredPermissions: readonly string[],
  ): boolean {
    if (requiredPermissions.length === 0) {
      return true;
    }
    const permissionSet = new Set(userPermissions);
    return requiredPermissions.every((permission) => permissionSet.has(permission));
  }
}
