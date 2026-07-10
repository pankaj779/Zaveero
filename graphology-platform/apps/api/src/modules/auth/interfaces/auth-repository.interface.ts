export interface AuthUserRecord {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  passwordHash: string;
  emailVerified: boolean;
  isActive: boolean;
  deletedAt: Date | null;
}

export interface RegisterUserInput {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  passwordHash: string;
  organizationSlug: string;
  roleName: string;
}

export interface RegisterUserResult {
  userId: string;
  email: string;
  organizationName: string;
}

/**
 * Abstraction for authentication-related persistence.
 * Services must depend on this interface, never Prisma directly.
 */
export interface AuthRepository {
  readonly marker: 'auth-repository';

  /**
   * Creates a user, organization membership, and role assignment in one transaction.
   */
  registerUser(input: RegisterUserInput): Promise<RegisterUserResult>;
}
