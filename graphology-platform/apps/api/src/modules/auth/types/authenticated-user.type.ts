import type { AuthRoleName } from '../constants/auth.constants';

/**
 * Shape of the authenticated user attached to requests in future auth tasks.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  roles: AuthRoleName[];
}
