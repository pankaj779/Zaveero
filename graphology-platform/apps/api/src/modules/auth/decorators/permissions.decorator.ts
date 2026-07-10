import { SetMetadata } from '@nestjs/common';
import type { AuthPermissionName } from '../constants/auth.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Declares required permissions for a route. Matching is AND across listed permissions.
 */
export const Permissions = (
  ...permissions: AuthPermissionName[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);
