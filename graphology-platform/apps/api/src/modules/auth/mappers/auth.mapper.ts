import type { AuthUserRecord } from '../interfaces/auth-repository.interface';
import type { UserAuthorizationContext } from '../interfaces/authorization-repository.interface';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { AuthRoleName } from '../constants/auth.constants';

/**
 * Maps persistence records to API-facing auth shapes.
 */
export class AuthMapper {
  static toAuthenticatedUser(
    user: Pick<AuthUserRecord, 'id' | 'email'> | UserAuthorizationContext,
    roles: AuthRoleName[] = [],
  ): AuthenticatedUser {
    if ('userId' in user) {
      return {
        id: user.userId,
        email: user.email,
        roles: user.roles,
        permissions: user.permissions,
        organizationIds: user.activeOrganizationIds,
      };
    }

    return {
      id: user.id,
      email: user.email,
      roles,
      permissions: [],
      organizationIds: [],
    };
  }
}
