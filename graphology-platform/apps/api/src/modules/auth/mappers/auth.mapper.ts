import type { AuthUserRecord } from '../interfaces/auth-repository.interface';
import type { AuthenticatedUser } from '../types/authenticated-user.type';
import type { AuthRoleName } from '../constants/auth.constants';

/**
 * Maps persistence records to API-facing auth shapes.
 * Mapping logic will be completed in later authentication tasks.
 */
export class AuthMapper {
  static toAuthenticatedUser(
    user: Pick<AuthUserRecord, 'id' | 'email'>,
    roles: AuthRoleName[] = [],
  ): AuthenticatedUser {
    return {
      id: user.id,
      email: user.email,
      roles,
    };
  }
}
