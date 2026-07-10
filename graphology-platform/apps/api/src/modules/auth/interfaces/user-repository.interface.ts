import type { AuthUserRecord } from './auth-repository.interface';

/**
 * Abstraction for user identity persistence.
 * Services must depend on this interface, never Prisma directly.
 */
export interface UserRepository {
  /**
   * Reserved for future user persistence operations.
   * Intentionally empty in the foundation task.
   */
  readonly marker: 'user-repository';
}

export type { AuthUserRecord };
