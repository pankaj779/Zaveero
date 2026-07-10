import { SetMetadata } from '@nestjs/common';
import type { AuthRoleName } from '../constants/auth.constants';

export const ROLES_KEY = 'roles';

/**
 * Placeholder roles decorator for route-level RBAC metadata.
 */
export const Roles = (...roles: AuthRoleName[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
