import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { hash, verify } from 'argon2';
import { prisma } from '@graphology/database';
import { JwtService } from '@nestjs/jwt';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
} from '../constants/auth.constants';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
} from '../exceptions';
import { PrismaAuthRepository } from '../repositories/prisma-auth.repository';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';

const shouldRunDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';

describe.runIf(shouldRunDatabaseTests)('Auth registration and login integration', () => {
  const jwtSecret = process.env.JWT_SECRET ?? 'test-jwt-secret';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_EXPIRATION ?? '15m';

  const authRepository = new PrismaAuthRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const jwtService = new JwtService({
    secret: jwtSecret,
  });
  const configService = {
    get: (key: string) => {
      if (key === 'JWT_EXPIRES_IN') {
        return jwtExpiresIn;
      }
      if (key === 'JWT_SECRET') {
        return jwtSecret;
      }
      return undefined;
    },
  };
  const tokenService = new TokenService(jwtService, configService as never);
  const service = new AuthService(authRepository, userRepository, tokenService);

  const suffix = Date.now().toString();
  const email = `auth-${suffix}@example.com`;
  const phone = `+9198${suffix.slice(-8)}`;
  const password = 'SecurePass1!';
  let createdUserId: string | undefined;

  beforeAll(async () => {
    await prisma.$connect();

    const organization = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORGANIZATION.slug },
    });
    const role = await prisma.role.findUnique({
      where: { name: DEFAULT_REGISTRATION_ROLE },
    });

    expect(organization).not.toBeNull();
    expect(role).not.toBeNull();
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
      await prisma.organizationMember.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }

    await prisma.$disconnect();
  });

  it('registers a user with org membership, student role, and hashed password', async () => {
    const result = await service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email,
      password,
      phone,
    });

    createdUserId = result.data.userId;

    expect(result.message).toBe('Registration successful. Please verify your email.');
    expect(result.data).toEqual({
      userId: createdUserId,
      email,
      organization: DEFAULT_ORGANIZATION.name,
    });

    const user = await prisma.user.findUnique({
      where: { id: createdUserId },
      include: {
        organizationMembers: {
          include: { organization: true },
        },
        userRoles: {
          include: { role: true },
        },
      },
    });

    expect(user).not.toBeNull();
    if (!user) {
      throw new Error('Expected registered user to exist');
    }

    expect(user.emailVerified).toBe(false);
    expect(user.passwordHash).not.toBe(password);
    await expect(verify(user.passwordHash, password)).resolves.toBe(true);

    expect(user.organizationMembers).toHaveLength(1);
    expect(user.organizationMembers[0]?.organization.slug).toBe(DEFAULT_ORGANIZATION.slug);
    expect(user.organizationMembers[0]?.status).toBe('ACTIVE');

    expect(user.userRoles).toHaveLength(1);
    expect(user.userRoles[0]?.role.name).toBe(DEFAULT_REGISTRATION_ROLE);
  });

  it('logs in successfully and returns a verifiable JWT', async () => {
    const result = await service.login({ email, password });

    expect(result.message).toBe('Login successful.');
    expect(result.data.expiresIn).toBe(jwtExpiresIn);
    expect(result.data.user).toEqual({
      id: createdUserId,
      firstName: 'Ada',
      lastName: 'Lovelace',
      email,
    });
    expect(result.data).not.toHaveProperty('password');
    expect(result.data).not.toHaveProperty('passwordHash');
    expect(result.data).not.toHaveProperty('refreshToken');

    const payload = await jwtService.verifyAsync<{
      sub: string;
      email: string;
      type: string;
    }>(result.data.accessToken);

    expect(payload.sub).toBe(createdUserId);
    expect(payload.email).toBe(email);
    expect(payload.type).toBe('access');
  });

  it('rejects duplicate email registration', async () => {
    await expect(
      service.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email,
        password,
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
  });

  it('rejects wrong password and unknown email with the same exception', async () => {
    await expect(
      service.login({ email, password: 'WrongPass1!' }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);

    await expect(
      service.login({ email: `missing-${suffix}@example.com`, password }),
    ).rejects.toBeInstanceOf(InvalidCredentialsException);
  });

  it('rejects inactive and soft-deleted accounts', async () => {
    if (!createdUserId) {
      throw new Error('Expected created user id');
    }

    await prisma.user.update({
      where: { id: createdUserId },
      data: { isActive: false },
    });

    await expect(service.login({ email, password })).rejects.toBeInstanceOf(
      AccountDisabledException,
    );

    await prisma.user.update({
      where: { id: createdUserId },
      data: { isActive: true, deletedAt: new Date() },
    });

    await expect(service.login({ email, password })).rejects.toBeInstanceOf(
      AccountDisabledException,
    );

    await prisma.user.update({
      where: { id: createdUserId },
      data: { isActive: true, deletedAt: null },
    });
  });

  it('rolls back when role assignment fails inside the transaction', async () => {
    const rollbackEmail = `rollback-${suffix}@example.com`;

    await expect(
      prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findUniqueOrThrow({
          where: { slug: DEFAULT_ORGANIZATION.slug },
        });

        const user = await tx.user.create({
          data: {
            firstName: 'Rollback',
            lastName: 'User',
            email: rollbackEmail,
            passwordHash: await hash('SecurePass1!'),
            emailVerified: false,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            status: 'ACTIVE',
          },
        });

        throw new Error('forced rollback');
      }),
    ).rejects.toThrow('forced rollback');

    const leftover = await prisma.user.findUnique({ where: { email: rollbackEmail } });
    expect(leftover).toBeNull();
  });
});
