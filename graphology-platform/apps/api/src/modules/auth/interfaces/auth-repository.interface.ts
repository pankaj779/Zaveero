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

export interface CreateEmailVerificationTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface EmailVerificationTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  createdAt: Date;
}

export interface RefreshTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
  replacedByTokenId: string | null;
}

export interface CreateRefreshTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface RotateRefreshTokenInput {
  currentTokenId: string;
  userId: string;
  newTokenHash: string;
  newExpiresAt: Date;
}

export interface RotateRefreshTokenResult {
  newToken: RefreshTokenRecord;
  revokedToken: RefreshTokenRecord;
}

export interface CreatePasswordResetTokenInput {
  userId: string;
  tokenHash: string;
  expiresAt: Date;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  usedAt: Date | null;
  createdAt: Date;
}

export interface CompletePasswordResetInput {
  userId: string;
  passwordHash: string;
  resetTokenId: string;
}

/**
 * Abstraction for authentication-related persistence.
 * Services must depend on this interface, never Prisma directly.
 */
export interface AuthRepository {
  readonly marker: 'auth-repository';

  registerUser(input: RegisterUserInput): Promise<RegisterUserResult>;

  createEmailVerificationToken(
    input: CreateEmailVerificationTokenInput,
  ): Promise<EmailVerificationTokenRecord>;

  findEmailVerificationTokenByHash(
    tokenHash: string,
  ): Promise<EmailVerificationTokenRecord | null>;

  deleteEmailVerificationTokensForUser(userId: string): Promise<void>;

  deleteEmailVerificationToken(id: string): Promise<void>;

  createRefreshToken(input: CreateRefreshTokenInput): Promise<RefreshTokenRecord>;

  findRefreshTokenByHash(tokenHash: string): Promise<RefreshTokenRecord | null>;

  rotateRefreshToken(input: RotateRefreshTokenInput): Promise<RotateRefreshTokenResult>;

  revokeRefreshToken(id: string): Promise<void>;

  revokeAllRefreshTokensForUser(userId: string): Promise<void>;

  createPasswordResetToken(
    input: CreatePasswordResetTokenInput,
  ): Promise<PasswordResetTokenRecord>;

  findPasswordResetTokenByHash(
    tokenHash: string,
  ): Promise<PasswordResetTokenRecord | null>;

  deletePasswordResetTokensForUser(userId: string): Promise<void>;

  /**
   * Updates password, invalidates reset tokens, and revokes refresh tokens
   * inside a single database transaction.
   */
  completePasswordReset(input: CompletePasswordResetInput): Promise<void>;
}
