import { hash } from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EmailService } from '../../email/interfaces/email-service.interface';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  PhoneAlreadyExistsException,
  TokenExpiredException,
  TokenInvalidException,
} from '../exceptions';
import type {
  AuthRepository,
  AuthUserRecord,
  CreateEmailVerificationTokenInput,
  CreateRefreshTokenInput,
  EmailVerificationTokenRecord,
  RefreshTokenRecord,
  RegisterUserInput,
  RegisterUserResult,
} from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import { AuthService } from '../services/auth.service';
import type { TokenService } from '../services/token.service';
import {
  generateEmailVerificationToken,
  hashEmailVerificationToken,
} from '../utils/email-verification-token.util';

function createMockAuthRepository(
  overrides: Partial<AuthRepository> & Pick<
    AuthRepository,
    | 'registerUser'
    | 'createEmailVerificationToken'
    | 'findEmailVerificationTokenByHash'
    | 'deleteEmailVerificationTokensForUser'
    | 'deleteEmailVerificationToken'
  >,
): AuthRepository {
  return {
    marker: 'auth-repository',
    createRefreshToken: vi.fn(),
    findRefreshTokenByHash: vi.fn(),
    rotateRefreshToken: vi.fn(),
    revokeRefreshToken: vi.fn(),
    revokeAllRefreshTokensForUser: vi.fn(),
    createPasswordResetToken: vi.fn(),
    findPasswordResetTokenByHash: vi.fn(),
    deletePasswordResetTokensForUser: vi.fn(),
    completePasswordReset: vi.fn(),
    ...overrides,
  };
}

function createAuthService(deps: {
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

describe('AuthService.register', () => {
  const registerUser = vi.fn<(input: RegisterUserInput) => Promise<RegisterUserResult>>();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn<(phone: string) => Promise<AuthUserRecord | null>>();
  const findById = vi.fn();
  const markEmailVerified = vi.fn();
  const createEmailVerificationToken = vi.fn();
  const findEmailVerificationTokenByHash = vi.fn();
  const deleteEmailVerificationTokensForUser = vi.fn();
  const deleteEmailVerificationToken = vi.fn();
  const createAccessToken = vi.fn();
  const createTokenPair = vi.fn();
  const createRefreshToken =
    vi.fn<(input: CreateRefreshTokenInput) => Promise<RefreshTokenRecord>>();
  const sendEmail = vi.fn<(input: { to: string; subject: string; html: string; text?: string }) => Promise<void>>();

  const authRepository = createMockAuthRepository({
    registerUser,
    createEmailVerificationToken,
    findEmailVerificationTokenByHash,
    deleteEmailVerificationTokensForUser,
    deleteEmailVerificationToken,
    createRefreshToken,
  });

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
    findById,
    markEmailVerified,
  };

  const tokenService = { createAccessToken, createTokenPair } as unknown as TokenService;
  const emailService = { sendEmail } as unknown as EmailService;
  let service: AuthService;

  const validDto: RegisterDto = {
    firstName: 'Ada',
    lastName: 'Lovelace',
    email: 'ada@example.com',
    password: 'SecurePass1!',
    phone: '+919876543210',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService({
      authRepository,
      userRepository,
      tokenService,
      emailService,
    });
    createEmailVerificationToken.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
    });
    deleteEmailVerificationTokensForUser.mockResolvedValue(undefined);
    sendEmail.mockResolvedValue(undefined);
  });

  it('registers a user with hashed password and sends verification email', async () => {
    findByEmail.mockResolvedValue(null);
    findByPhone.mockResolvedValue(null);
    registerUser.mockResolvedValue({
      userId: 'user-1',
      email: 'ada@example.com',
      organizationName: 'Graphology Academy',
    });

    const result = await service.register(validDto);

    expect(result).toEqual({
      message: 'Registration successful. Please verify your email.',
      data: {
        userId: 'user-1',
        email: 'ada@example.com',
        organization: 'Graphology Academy',
      },
    });
    expect(createEmailVerificationToken).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalledTimes(1);
    const [emailPayload] = sendEmail.mock.calls[0] ?? [];
    expect(emailPayload).toMatchObject({
      to: 'ada@example.com',
    });
    expect(emailPayload?.subject).toContain('Verify your email');
  });

  it('keeps registration successful when email sending fails', async () => {
    findByEmail.mockResolvedValue(null);
    findByPhone.mockResolvedValue(null);
    registerUser.mockResolvedValue({
      userId: 'user-1',
      email: 'ada@example.com',
      organizationName: 'Graphology Academy',
    });
    sendEmail.mockRejectedValue(new Error('provider unavailable'));

    await expect(service.register(validDto)).resolves.toMatchObject({
      data: { userId: 'user-1' },
    });
    expect(registerUser).toHaveBeenCalled();
  });

  it('rejects duplicate email', async () => {
    findByEmail.mockResolvedValue({
      id: 'existing',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: 'hash',
      emailVerified: false,
      isActive: true,
      deletedAt: null,
    });

    await expect(service.register(validDto)).rejects.toBeInstanceOf(
      EmailAlreadyExistsException,
    );
  });

  it('rejects duplicate phone', async () => {
    findByEmail.mockResolvedValue(null);
    findByPhone.mockResolvedValue({
      id: 'existing',
      email: 'other@example.com',
      firstName: 'Other',
      lastName: 'User',
      phone: '+919876543210',
      passwordHash: 'hash',
      emailVerified: false,
      isActive: true,
      deletedAt: null,
    });

    await expect(service.register(validDto)).rejects.toBeInstanceOf(
      PhoneAlreadyExistsException,
    );
  });
});

describe('AuthService.login', () => {
  const registerUser = vi.fn();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn();
  const findById = vi.fn();
  const markEmailVerified = vi.fn();
  const createEmailVerificationToken = vi.fn();
  const findEmailVerificationTokenByHash = vi.fn();
  const deleteEmailVerificationTokensForUser = vi.fn();
  const deleteEmailVerificationToken = vi.fn();
  const createAccessToken = vi.fn();
  const createTokenPair = vi.fn();
  const createRefreshToken =
    vi.fn<(input: CreateRefreshTokenInput) => Promise<RefreshTokenRecord>>();
  const sendEmail = vi.fn<(input: { to: string; subject: string; html: string; text?: string }) => Promise<void>>();

  const authRepository = createMockAuthRepository({
    registerUser,
    createEmailVerificationToken,
    findEmailVerificationTokenByHash,
    deleteEmailVerificationTokensForUser,
    deleteEmailVerificationToken,
    createRefreshToken,
  });

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
    findById,
    markEmailVerified,
  };

  const tokenService = { createAccessToken, createTokenPair } as unknown as TokenService;
  const emailService = { sendEmail } as unknown as EmailService;
  let service: AuthService;
  let activeUser: AuthUserRecord;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = createAuthService({
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
      emailVerified: false,
      isActive: true,
      deletedAt: null,
    };
  });

  it('logs in successfully and returns access and refresh tokens', async () => {
    findByEmail.mockResolvedValue(activeUser);
    createTokenPair.mockResolvedValue({
      accessToken: 'jwt-token',
      refreshToken: 'refresh-token',
      expiresIn: '15m',
      refreshTokenHash: 'refresh-hash',
      refreshTokenExpiresAt: new Date(Date.now() + 86_400_000),
    });
    createRefreshToken.mockResolvedValue({
      id: 'rt-1',
      userId: 'user-1',
      tokenHash: 'refresh-hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      revokedAt: null,
      createdAt: new Date(),
      replacedByTokenId: null,
    });

    const result = await service.login({
      email: 'ada@example.com',
      password: 'SecurePass1!',
    });

    expect(result.data.accessToken).toBe('jwt-token');
    expect(result.data.refreshToken).toBe('refresh-token');
    expect(createRefreshToken).toHaveBeenCalledTimes(1);
    const refreshInput = createRefreshToken.mock.calls[0]?.[0];
    expect(refreshInput?.userId).toBe('user-1');
    expect(refreshInput?.tokenHash).toBe('refresh-hash');
    expect(refreshInput?.expiresAt).toBeInstanceOf(Date);
  });

  it('rejects wrong password with InvalidCredentialsException', async () => {
    findByEmail.mockResolvedValue(activeUser);

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'WrongPass1!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('rejects unknown email with InvalidCredentialsException', async () => {
    findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('rejects inactive accounts', async () => {
    findByEmail.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledException);
  });

  it('rejects soft-deleted accounts', async () => {
    findByEmail.mockResolvedValue({
      ...activeUser,
      deletedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledException);
  });

  it('rejects disabled accounts', async () => {
    findByEmail.mockResolvedValue({ ...activeUser, isActive: false });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledException);
  });
});

describe('AuthService.verifyEmail and resendVerification', () => {
  const registerUser = vi.fn();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn();
  const findById = vi.fn<(id: string) => Promise<AuthUserRecord | null>>();
  const markEmailVerified = vi.fn();
  const createEmailVerificationToken =
    vi.fn<(input: CreateEmailVerificationTokenInput) => Promise<EmailVerificationTokenRecord>>();
  const findEmailVerificationTokenByHash =
    vi.fn<(tokenHash: string) => Promise<EmailVerificationTokenRecord | null>>();
  const deleteEmailVerificationTokensForUser = vi.fn();
  const deleteEmailVerificationToken = vi.fn();
  const createAccessToken = vi.fn();
  const createTokenPair = vi.fn();
  const createRefreshToken =
    vi.fn<(input: CreateRefreshTokenInput) => Promise<RefreshTokenRecord>>();
  const sendEmail = vi.fn<(input: { to: string; subject: string; html: string; text?: string }) => Promise<void>>();

  const authRepository = createMockAuthRepository({
    registerUser,
    createEmailVerificationToken,
    findEmailVerificationTokenByHash,
    deleteEmailVerificationTokensForUser,
    deleteEmailVerificationToken,
    createRefreshToken,
  });

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
    findById,
    markEmailVerified,
  };

  const tokenService = { createAccessToken, createTokenPair } as unknown as TokenService;
  const emailService = { sendEmail } as unknown as EmailService;
  let service: AuthService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = createAuthService({
      authRepository,
      userRepository,
      tokenService,
      emailService,
    });
    createEmailVerificationToken.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() + 86_400_000),
      createdAt: new Date(),
    });
    deleteEmailVerificationTokensForUser.mockResolvedValue(undefined);
    deleteEmailVerificationToken.mockResolvedValue(undefined);
    markEmailVerified.mockResolvedValue(undefined);
    sendEmail.mockResolvedValue(undefined);
  });

  it('verifies a valid token and marks the user verified', async () => {
    const rawToken = generateEmailVerificationToken();
    const tokenHash = hashEmailVerificationToken(rawToken);

    findEmailVerificationTokenByHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash,
      expiresAt: new Date(Date.now() + 60_000),
      createdAt: new Date(),
    });
    findById.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: 'hash',
      emailVerified: false,
      isActive: true,
      deletedAt: null,
    });

    const result = await service.verifyEmail({ token: rawToken });

    expect(result).toEqual({
      message: 'Email verified successfully.',
      data: { email: 'ada@example.com' },
    });
    expect(markEmailVerified).toHaveBeenCalledWith('user-1');
    expect(deleteEmailVerificationTokensForUser).toHaveBeenCalledWith('user-1');
  });

  it('rejects invalid tokens', async () => {
    findEmailVerificationTokenByHash.mockResolvedValue(null);

    await expect(service.verifyEmail({ token: 'invalid-token' })).rejects.toBeInstanceOf(
      TokenInvalidException,
    );
  });

  it('rejects expired tokens', async () => {
    findEmailVerificationTokenByHash.mockResolvedValue({
      id: 'token-1',
      userId: 'user-1',
      tokenHash: 'hash',
      expiresAt: new Date(Date.now() - 1000),
      createdAt: new Date(),
    });

    await expect(service.verifyEmail({ token: 'expired-token' })).rejects.toBeInstanceOf(
      TokenExpiredException,
    );
    expect(deleteEmailVerificationToken).toHaveBeenCalledWith('token-1');
  });

  it('returns success when email is already verified on resend', async () => {
    findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: 'hash',
      emailVerified: true,
      isActive: true,
      deletedAt: null,
    });

    const result = await service.resendVerification({ email: 'ada@example.com' });

    expect(result.message).toBe('Email is already verified.');
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('does not reveal whether an email exists on resend', async () => {
    findByEmail.mockResolvedValue(null);

    const result = await service.resendVerification({ email: 'missing@example.com' });

    expect(result.message).toBe(
      'If an account exists for this email, a verification link has been sent.',
    );
    expect(sendEmail).not.toHaveBeenCalled();
  });

  it('resends verification for an unverified account', async () => {
    findByEmail.mockResolvedValue({
      id: 'user-1',
      email: 'ada@example.com',
      firstName: 'Ada',
      lastName: 'Lovelace',
      phone: null,
      passwordHash: 'hash',
      emailVerified: false,
      isActive: true,
      deletedAt: null,
    });

    const result = await service.resendVerification({ email: 'ada@example.com' });

    expect(result.message).toBe(
      'If an account exists for this email, a verification link has been sent.',
    );
    expect(createEmailVerificationToken).toHaveBeenCalled();
    expect(sendEmail).toHaveBeenCalled();
  });
});

describe('RegisterDto validation', () => {
  it('rejects weak passwords', async () => {
    const dto = plainToInstance(RegisterDto, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      password: 'weak',
    });

    const errors = await validate(dto);
    expect(errors.some((error) => error.property === 'password')).toBe(true);
  });

  it('rejects missing required fields', async () => {
    const dto = plainToInstance(RegisterDto, {});
    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(
      expect.arrayContaining(['firstName', 'lastName', 'email', 'password']),
    );
  });

  it('accepts a valid payload with optional phone', async () => {
    const dto = plainToInstance(RegisterDto, {
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'Ada@Example.com',
      password: 'SecurePass1!',
      phone: '+919876543210',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('ada@example.com');
  });
});

describe('LoginDto validation', () => {
  it('rejects missing email and password', async () => {
    const dto = plainToInstance(LoginDto, {});
    const errors = await validate(dto);
    const properties = errors.map((error) => error.property);

    expect(properties).toEqual(expect.arrayContaining(['email', 'password']));
  });

  it('normalizes email to lowercase', async () => {
    const dto = plainToInstance(LoginDto, {
      email: 'Ada@Example.com',
      password: 'SecurePass1!',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
    expect(dto.email).toBe('ada@example.com');
  });
});

describe('email verification token util', () => {
  it('hashes tokens deterministically without storing the raw value', () => {
    const token = generateEmailVerificationToken();
    expect(token).not.toEqual(hashEmailVerificationToken(token));
    expect(hashEmailVerificationToken(token)).toBe(hashEmailVerificationToken(token));
  });
});
