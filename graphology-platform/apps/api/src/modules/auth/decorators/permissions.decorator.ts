import { SetMetadata } from '@nestjs/common';
import type { AuthPermissionName } from '../constants/auth.constants';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Placeholder permissions decorator for route-level authorization metadata.
 */
export const Permissions = (
  ...permissions: AuthPermissionName[]
): ReturnType<typeof SetMetadata> => SetMetadata(PERMISSIONS_KEY, permissions);
