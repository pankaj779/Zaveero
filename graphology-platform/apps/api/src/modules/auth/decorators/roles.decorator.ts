import { SetMetadata } from '@nestjs/common';
import type { AuthRoleName } from '../constants/auth.constants';

export const ROLES_KEY = 'roles';

/**
 * Declares required roles for a route. Matching is OR across listed roles.
 */
export const Roles = (...roles: AuthRoleName[]): ReturnType<typeof SetMetadata> =>
  SetMetadata(ROLES_KEY, roles);
