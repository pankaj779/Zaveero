import { hash } from 'argon2';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LoginDto } from '../dto/login.dto';
import { RegisterDto } from '../dto/register.dto';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  PhoneAlreadyExistsException,
} from '../exceptions';
import type {
  AuthRepository,
  AuthUserRecord,
  RegisterUserInput,
  RegisterUserResult,
} from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import { AuthService } from '../services/auth.service';
import type { TokenService } from '../services/token.service';

describe('AuthService.register', () => {
  const registerUser = vi.fn<(input: RegisterUserInput) => Promise<RegisterUserResult>>();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn<(phone: string) => Promise<AuthUserRecord | null>>();
  const createAccessToken = vi.fn();

  const authRepository: AuthRepository = {
    marker: 'auth-repository',
    registerUser,
  };

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
  };

  const tokenService = {
    createAccessToken,
  } as unknown as TokenService;

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
    service = new AuthService(authRepository, userRepository, tokenService);
  });

  it('registers a user with hashed password and response contract', async () => {
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

    expect(registerUser).toHaveBeenCalledTimes(1);
    const [registerInput] = registerUser.mock.calls[0] ?? [];
    expect(registerInput).toMatchObject({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      phone: '+919876543210',
      organizationSlug: 'graphology-academy',
      roleName: 'Student',
    });
    expect(registerInput?.passwordHash).toMatch(/^\$argon2/);
    expect(registerInput?.passwordHash).not.toBe(validDto.password);
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
    expect(registerUser).not.toHaveBeenCalled();
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
    expect(registerUser).not.toHaveBeenCalled();
  });
});

describe('AuthService.login', () => {
  const registerUser = vi.fn();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn();
  const createAccessToken = vi.fn();

  const authRepository: AuthRepository = {
    marker: 'auth-repository',
    registerUser,
  };

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
  };

  const tokenService = {
    createAccessToken,
  } as unknown as TokenService;

  let service: AuthService;
  let activeUser: AuthUserRecord;

  beforeEach(async () => {
    vi.clearAllMocks();
    service = new AuthService(authRepository, userRepository, tokenService);
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

  it('logs in successfully and returns an access token', async () => {
    findByEmail.mockResolvedValue(activeUser);
    createAccessToken.mockResolvedValue({
      accessToken: 'jwt-token',
      expiresIn: '15m',
    });

    const result = await service.login({
      email: 'ada@example.com',
      password: 'SecurePass1!',
    });

    expect(result).toEqual({
      message: 'Login successful.',
      data: {
        accessToken: 'jwt-token',
        expiresIn: '15m',
        user: {
          id: 'user-1',
          firstName: 'Ada',
          lastName: 'Lovelace',
          email: 'ada@example.com',
        },
      },
    });
    expect(createAccessToken).toHaveBeenCalledWith({
      id: 'user-1',
      email: 'ada@example.com',
    });
  });

  it('rejects wrong password with InvalidCredentialsException', async () => {
    findByEmail.mockResolvedValue(activeUser);

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'WrongPass1!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it('rejects unknown email with InvalidCredentialsException', async () => {
    findByEmail.mockResolvedValue(null);

    await expect(
      service.login({
        email: 'missing@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it('rejects inactive accounts', async () => {
    findByEmail.mockResolvedValue({
      ...activeUser,
      isActive: false,
    });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledException);
    expect(createAccessToken).not.toHaveBeenCalled();
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
    expect(createAccessToken).not.toHaveBeenCalled();
  });

  it('rejects disabled accounts', async () => {
    findByEmail.mockResolvedValue({
      ...activeUser,
      isActive: false,
      deletedAt: null,
    });

    await expect(
      service.login({
        email: 'ada@example.com',
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(AccountDisabledException);
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
    expect(errors.length).toBeGreaterThan(0);
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
