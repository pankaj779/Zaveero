export interface AuthUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  passwordHash: string;
  emailVerified: boolean;
  isActive: boolean;
  deletedAt: Date | null;
}

/**
 * Abstraction for authentication-related persistence.
 * Services must depend on this interface, never Prisma directly.
 */
export interface AuthRepository {
  /**
   * Reserved for future authentication persistence operations.
   * Intentionally empty in the foundation task.
   */
  readonly marker: 'auth-repository';
}
