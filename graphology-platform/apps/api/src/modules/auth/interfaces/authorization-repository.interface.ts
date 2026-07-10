import type { AuthPermissionName, AuthRoleName } from '../constants/auth.constants';

/**
 * Authorization context loaded for an authenticated user.
 * Roles/permissions are evaluated only when the user has an active org membership.
 */
export interface UserAuthorizationContext {
  userId: string;
  email: string;
  isActive: boolean;
  deletedAt: Date | null;
  roles: AuthRoleName[];
  permissions: AuthPermissionName[];
  /** Organization IDs where membership is ACTIVE and the organization is active. */
  activeOrganizationIds: string[];
}

/**
 * Abstraction for RBAC persistence lookups.
 * Services must depend on this interface, never Prisma directly.
 */
export interface AuthorizationRepository {
  readonly marker: 'authorization-repository';

  findAuthorizationContext(userId: string): Promise<UserAuthorizationContext | null>;

  findPermissionsForUser(userId: string): Promise<AuthPermissionName[]>;

  findRolesForUser(userId: string): Promise<AuthRoleName[]>;
}
