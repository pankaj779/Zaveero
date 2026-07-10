import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { hash } from 'argon2';
import type { EmailService } from '../../email/interfaces/email-service.interface';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import {
  TokenExpiredException,
  TokenInvalidException,
} from '../exceptions';
import type {
  AuthRepository,
  AuthUserRecord,
  CompletePasswordResetInput,
  CreatePasswordResetTokenInput,
  PasswordResetTokenRecord,
} from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import { AuthService } from '../services/auth.service';
import type { TokenService } from '../services/token.service';
import {
  generatePasswordResetToken,
  hashPasswordResetToken,
} from '../utils/password-reset-token.util';

function createService(deps: {
  authRepository: AuthRepository;
  userRepository: UserRepository;
  tokenService: TokenService;
  emailService: EmailService;
}): AuthService {
  const configService = {
    get: (key: string) => {
      if (key === 'FRONTEND_URL') {
        return 'http://localhost:3000';
      }
      if (key === 'APP_NAME') {
        return 'Graphology Platform';
      }
      return undefined;
    },
  };

  return new AuthService(
    deps.authRepository,
    deps.userRepository,
    deps.tokenService,
    deps.emailService,
    configService as never,
  );
}

describe('AuthService.forgotPassword and resetPassword', () => {
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findById = vi.fn<(id: string) => Promise<AuthUserRecord | null>>();
  const createPasswordResetToken =
    vi.fn<(input: CreatePasswordResetTokenInput) => Promise<PasswordResetTokenRecord>>();
  const findPasswordResetTokenByHash =
    vi.fn<(tokenHash: string) => Promise<PasswordResetTokenRecord | null>>();
  const deletePasswordResetTokensForUser = vi.fn();
  const completePasswordReset =
    vi.fn<(input: CompletePasswordResetInput) => Promise<void>>();
  const sendEmail =
    vi.fn<(input: { to: string; subject: string; html: string; text?: string }) => Promise<void>>();

  const authRepository: AuthRepository = {
    marker: 'auth-repository',
    registerUser: vi.fn(),
    createEmailVerificationToken: vi.fn(),
    findEmailVerificationTokenByHash: vi.fn(),
    deleteEmailVerificationTokensForUser: vi.fn(),
    deleteEmailVerificationToken: vi.fn(),
    createRefreshToken: vi.fn(),
    findRefreshTokenByHash: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllRefreshTokensForUser: vi.fn(),
    createPasswordResetToken,
    findPasswordResetTokenByHash,
    deletePasswordResetTokensForUser,
    completePasswordReset,
  };

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone: vi.fn(),
    findById,
    markEmailVerified: vi.fn(),
  };

  const tokenService = {
    createAccessToken: vi.fn(),
    createTokenPair: vi.fn(),
    hashIncomingRefreshToken: vi.fn(),
  } as unknown as TokenService;

  const emailService = { sendEmail } as unknown as EmailService;
  let service: AuthService;
  let activeUser: AuthUserRecord;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = createService({
      authRepository,
      userRepository,
      tokenService,
      emailService,
    });
    activeUser = {
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: await hash('SecurePass1!'),
      emailVerified: true,
      isActive: true,
      deletedAt: null,
    };

    createPasswordResetToken.mockResolvedValue({
      id: 'prt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    deletePasswordResetTokensForUser.mockResolvedValue(undefined);
    completePasswordReset.mockResolvedValue(undefined);
    sendEmail.mockResolvedValue(undefined);
  });

  it('returns a generic success message for known emails and sends reset mail', async () => {
    findByEmail.mockResolvedValue(activeUser);

    const result = await service.forgotPassword({ email: 'ada@example.com' });

    expect(result).toEqual({
      message: 'If an account exists, password reset instructions have been sent.',
      data: null,
    });
    expect(createPasswordResetToken).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    expect(sendEmail.mock.calls[0]?.[0].to).toBe('ada@example.com');
    expect(sendEmail.mock.calls[0]?.[0].subject).toContain('Reset your password');
  });

  it('returns the same success message for unknown emails', async () => {
    findByEmail.mockResolvedValue(null);

    const result = await service.forgotPassword({ email: 'missing@example.com' });

    expect(result.message).toBe(
      'If an account exists, password reset instructions have been sent.',
    );
    expect(createPasswordResetToken).not.toHaveBeenCalled();
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('resets password with a valid token and revokes sessions via repository', async () => {
    const rawToken = generatePasswordResetToken();
    findPasswordResetTokenByHash.mockResolvedValue({
      id: 'prt-1',
      userId: 'user-1',
      tokenHash: hashPasswordResetToken(rawToken),
      expiresAt: new Date(Date.now() + 30 * 60_000),
      usedAt: null,
      createdAt: new Date(),
    });
    findById.mockResolvedValue(activeUser);

    const result = await service.resetPassword({
      token: rawToken,
      password: 'NewStrongPass1!',
    });

    expect(result.message).toBe('Password has been reset successfully.');
    expect(completePasswordReset).toHaveBeenCalledTimes(1);
    const completeInput = completePasswordReset.mock.calls[0]?.[0];
    expect(completeInput?.userId).toBe('user-1');
    expect(completeInput?.resetTokenId).toBe('prt-1');
    expect(completeInput?.passwordHash).toMatch(/^\$argon2/);
    expect(completeInput?.passwordHash).not.toBe('NewStrongPass1!');
  });

  it('rejects invalid, expired, and reused tokens', async () => {
    findPasswordResetTokenByHash.mockResolvedValue(null);
    await expect(
      service.resetPassword({ token: 'invalid', password: 'NewStrongPass1!' }),
    ).rejects.toBeInstanceOf(TokenInvalidException);

    findPasswordResetTokenByHash.mockResolvedValue({
      id: 'prt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      usedAt: null,
      createdAt: new Date(),
    });
    await expect(
      service.resetPassword({ token: 'expired', password: 'NewStrongPass1!' }),
    ).rejects.toBeInstanceOf(TokenExpiredException);

    findPasswordResetTokenByHash.mockResolvedValue({
      id: 'prt-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 30 * 60_000),
      usedAt: new Date(),
      createdAt: new Date(),
    });
    await expect(
      service.resetPassword({ token: 'used', password: 'NewStrongPass1!' }),
    ).rejects.toBeInstanceOf(TokenInvalidException);
  });
});

describe('ResetPasswordDto validation', () => {
  it('rejects weak passwords', async () => {
    const dto = plainToInstance(ResetPasswordDto, {
      token: 'token',
      password: 'weak',
    });
    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });
});

describe('password reset token util', () => {
  it('hashes tokens without storing the raw value', () => {
    const token = generatePasswordResetToken();
    expect(hashPasswordResetToken(token)).not.toBe(token);
    expect(hashPasswordResetToken(token)).toBe(hashPasswordResetToken(token));
  });
});
