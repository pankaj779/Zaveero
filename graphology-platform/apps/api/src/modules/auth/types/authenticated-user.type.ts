import type { AuthPermissionName, AuthRoleName } from '../constants/auth.constants';

/**
 * Authenticated principal attached to the request by JwtAuthGuard.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: AuthRoleName[];
  permissions: AuthPermissionName[];
  organizationIds: string[];
}

export type AuthenticatedUserProperty = keyof AuthenticatedUser;
