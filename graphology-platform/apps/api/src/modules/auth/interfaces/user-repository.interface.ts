import type { AuthUserRecord } from './auth-repository.interface';

/**
 * Abstraction for user identity persistence.
 * Services must depend on this interface, never Prisma directly.
 */
export interface UserRepository {
  readonly marker: 'user-repository';

  findByEmail(email: string): Promise<AuthUserRecord | null>;

  findByPhone(phone: string): Promise<AuthUserRecord | null>;
}

export type { AuthUserRecord };
