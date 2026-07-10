import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RegisterDto } from '../dto/register.dto';
import {
  EmailAlreadyExistsException,
  PhoneAlreadyExistsException,
} from '../exceptions';
import type {
  AuthRepository,
  RegisterUserInput,
  RegisterUserResult,
} from '../interfaces/auth-repository.interface';
import type { AuthUserRecord } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';
import { AuthService } from '../services/auth.service';

describe('AuthService.register', () => {
  const registerUser = vi.fn<(input: RegisterUserInput) => Promise<RegisterUserResult>>();
  const findByEmail = vi.fn<(email: string) => Promise<AuthUserRecord | null>>();
  const findByPhone = vi.fn<(phone: string) => Promise<AuthUserRecord | null>>();

  const authRepository: AuthRepository = {
    marker: 'auth-repository',
    registerUser,
  };

  const userRepository: UserRepository = {
    marker: 'user-repository',
    findByEmail,
    findByPhone,
  };

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
    service = new AuthService(authRepository, userRepository);
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
