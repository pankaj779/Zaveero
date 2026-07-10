import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { hash, verify } from 'argon2';
import { prisma } from '@graphology/database';
import { JwtService } from '@nestjs/jwt';
import type { EmailService } from '../../email/interfaces/email-service.interface';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
} from '../constants/auth.constants';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  InvalidCredentialsException,
  TokenExpiredException,
  TokenInvalidException,
} from '../exceptions';
import { PrismaAuthRepository } from '../repositories/prisma-auth.repository';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { AuthService } from '../services/auth.service';
import { TokenService } from '../services/token.service';
import { hashEmailVerificationToken } from '../utils/email-verification-token.util';
import { hashPasswordResetToken } from '../utils/password-reset-token.util';

const shouldRunDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';

describe.runIf(shouldRunDatabaseTests)('Auth registration, login, and email verification', () => {
  const jwtSecret = process.env.JWT_SECRET ?? 'test-jwt-secret';
  const jwtExpiresIn = process.env.JWT_EXPIRES_IN ?? process.env.JWT_ACCESS_EXPIRATION ?? '15m';
  const refreshSecret =
    process.env.REFRESH_TOKEN_SECRET ?? process.env.JWT_REFRESH_SECRET ?? 'test-refresh-secret';
  const refreshExpiresIn =
    process.env.REFRESH_TOKEN_EXPIRES_IN ?? process.env.JWT_REFRESH_EXPIRATION ?? '7d';

  const authRepository = new PrismaAuthRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const jwtService = new JwtService({ secret: jwtSecret });
  const configService = {
    get: (key: string) => {
      if (key === 'JWT_EXPIRES_IN') {
        return jwtExpiresIn;
      }
      if (key === 'JWT_SECRET') {
        return jwtSecret;
      }
      if (key === 'REFRESH_TOKEN_SECRET') {
        return refreshSecret;
      }
      if (key === 'REFRESH_TOKEN_EXPIRES_IN') {
        return refreshExpiresIn;
      }
      if (key === 'FRONTEND_URL') {
        return process.env.FRONTEND_URL ?? 'http://localhost:3000';
      }
      if (key === 'APP_NAME') {
        return process.env.APP_NAME ?? 'Graphology Platform';
      }
      return undefined;
    },
  };
  const sendEmail = vi.fn().mockResolvedValue(undefined);
  const emailService = { sendEmail } as unknown as EmailService;
  const tokenService = new TokenService(jwtService, configService as never);
  const service = new AuthService(
    authRepository,
    userRepository,
    tokenService,
    emailService,
    configService as never,
  );

  const suffix = Date.now().toString();
  const email = `auth-${suffix}@example.com`;
  const phone = `+9198${suffix.slice(-8)}`;
  let password = 'SecurePass1!';
  let createdUserId: string | undefined;
  let latestRawToken: string | undefined;
  let currentRefreshToken: string | undefined;
  let latestPasswordResetToken: string | undefined;

  beforeAll(async () => {
    await prisma.$connect();

    sendEmail.mockImplementation((input: { html: string; subject?: string }) => {
      const match = /token=([^"&\s]+)/.exec(input.html);
      const token = match?.[1] ? decodeURIComponent(match[1]) : undefined;
      if (input.subject?.includes('Reset your password')) {
        latestPasswordResetToken = token;
      } else {
        latestRawToken = token;
      }
      return Promise.resolve();
    });
  });

  afterAll(async () => {
    if (createdUserId) {
      await prisma.refreshToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.passwordResetToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.emailVerificationToken.deleteMany({ where: { userId: createdUserId } });
      await prisma.userRole.deleteMany({ where: { userId: createdUserId } });
      await prisma.organizationMember.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }

    await prisma.$disconnect();
  });

  it('registers a user and stores a hashed verification token', async () => {
    const result = await service.register({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email,
      password,
      phone,
    });

    createdUserId = result.data.userId;
    expect(sendEmail).toHaveBeenCalled();
    expect(latestRawToken).toBeTruthy();
    if (!latestRawToken || !createdUserId) {
      throw new Error('Expected registration to create a verification token');
    }

    const stored = await prisma.emailVerificationToken.findMany({
      where: { userId: createdUserId },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toBe(hashEmailVerificationToken(latestRawToken));
    expect(stored[0]?.tokenHash).not.toBe(latestRawToken);

    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(user).not.toBeNull();
    if (!user) {
      throw new Error('Expected registered user');
    }
    expect(user.emailVerified).toBe(false);
    await expect(verify(user.passwordHash, password)).resolves.toBe(true);
  });

  it('verifies email with a valid token', async () => {
    if (!latestRawToken || !createdUserId) {
      throw new Error('Expected verification token from registration');
    }

    const result = await service.verifyEmail({ token: latestRawToken });

    expect(result.message).toBe('Email verified successfully.');
    expect(result.data.email).toBe(email);

    const user = await prisma.user.findUnique({ where: { id: createdUserId } });
    expect(user?.emailVerified).toBe(true);

    const tokens = await prisma.emailVerificationToken.findMany({
      where: { userId: createdUserId },
    });
    expect(tokens).toHaveLength(0);
  });

  it('rejects invalid and expired verification tokens', async () => {
    if (!createdUserId) {
      throw new Error('Expected created user id');
    }

    await expect(service.verifyEmail({ token: 'not-a-real-token' })).rejects.toBeInstanceOf(
      TokenInvalidException,
    );

    const expiredRaw = `expired-${suffix}`;
    await prisma.emailVerificationToken.create({
      data: {
        userId: createdUserId,
        tokenHash: hashEmailVerificationToken(expiredRaw),
        expiresAt: new Date(Date.now() - 60_000),
      },
    });

    await expect(service.verifyEmail({ token: expiredRaw })).rejects.toBeInstanceOf(
      TokenExpiredException,
    );
  });

  it('returns success for already verified resend requests', async () => {
    const result = await service.resendVerification({ email });
    expect(result.message).toBe('Email is already verified.');
  });

  it('logs in successfully, stores hashed refresh token, and rotates on refresh', async () => {
    const loginResult = await service.login({ email, password });

    expect(loginResult.message).toBe('Login successful.');
    expect(loginResult.data.refreshToken).toBeTruthy();
    currentRefreshToken = loginResult.data.refreshToken;

    const stored = await prisma.refreshToken.findMany({
      where: { userId: createdUserId, revokedAt: null },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).not.toBe(currentRefreshToken);
    expect(stored[0]?.tokenHash).toBe(
      tokenService.hashIncomingRefreshToken(currentRefreshToken),
    );

    const payload = await jwtService.verifyAsync<{ sub: string; email: string; type: string }>(
      loginResult.data.accessToken,
    );
    expect(payload.sub).toBe(createdUserId);
    expect(payload.type).toBe('access');

    const refreshResult = await service.refresh({ refreshToken: currentRefreshToken });
    expect(refreshResult.message).toBe('Token refreshed successfully.');
    expect(refreshResult.data.refreshToken).not.toBe(currentRefreshToken);

    const oldToken = currentRefreshToken;
    currentRefreshToken = refreshResult.data.refreshToken;

    const revoked = await prisma.refreshToken.findMany({
      where: { userId: createdUserId, revokedAt: { not: null } },
    });
    expect(revoked.length).toBeGreaterThan(0);
    expect(revoked[0]?.replacedByTokenId).toBeTruthy();

    await expect(service.refresh({ refreshToken: oldToken })).rejects.toBeInstanceOf(
      TokenInvalidException,
    );
  });

  it('logs out successfully and rejects the revoked refresh token', async () => {
    if (!currentRefreshToken) {
      throw new Error('Expected current refresh token');
    }

    const logoutResult = await service.logout({ refreshToken: currentRefreshToken });
    expect(logoutResult.message).toBe('Logged out successfully.');

    await expect(
      service.refresh({ refreshToken: currentRefreshToken }),
    ).rejects.toBeInstanceOf(TokenInvalidException);

    const unknownLogout = await service.logout({ refreshToken: 'already-invalid' });
    expect(unknownLogout.message).toBe('Logged out successfully.');
  });

  it('resets password, stores hashed reset tokens, and revokes refresh sessions', async () => {
    const loginResult = await service.login({ email, password });
    currentRefreshToken = loginResult.data.refreshToken;

    const unknownForgot = await service.forgotPassword({
      email: `missing-${suffix}@example.com`,
    });
    expect(unknownForgot.message).toBe(
      'If an account exists, password reset instructions have been sent.',
    );

    const forgot = await service.forgotPassword({ email });
    expect(forgot.message).toBe(
      'If an account exists, password reset instructions have been sent.',
    );
    expect(latestPasswordResetToken).toBeTruthy();
    if (!latestPasswordResetToken || !createdUserId) {
      throw new Error('Expected password reset token');
    }

    const stored = await prisma.passwordResetToken.findMany({
      where: { userId: createdUserId, usedAt: null },
    });
    expect(stored).toHaveLength(1);
    expect(stored[0]?.tokenHash).toBe(hashPasswordResetToken(latestPasswordResetToken));

    const newPassword = 'BrandNewPass1!';
    const reset = await service.resetPassword({
      token: latestPasswordResetToken,
      password: newPassword,
    });
    expect(reset.message).toBe('Password has been reset successfully.');

    await expect(
      service.resetPassword({
        token: latestPasswordResetToken,
        password: 'AnotherPass1!',
      }),
    ).rejects.toBeInstanceOf(TokenInvalidException);

    const activeRefresh = await prisma.refreshToken.count({
      where: { userId: createdUserId, revokedAt: null },
    });
    expect(activeRefresh).toBe(0);

    await expect(service.login({ email, password })).rejects.toBeInstanceOf(
      InvalidCredentialsException,
    );

    const relogin = await service.login({ email, password: newPassword });
    expect(relogin.data.refreshToken).toBeTruthy();
    currentRefreshToken = relogin.data.refreshToken;
    password = newPassword;
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

  it('keeps seeded org and student role available', async () => {
    const organization = await prisma.organization.findUnique({
      where: { slug: DEFAULT_ORGANIZATION.slug },
    });
    const role = await prisma.role.findUnique({
      where: { name: DEFAULT_REGISTRATION_ROLE },
    });

    expect(organization).not.toBeNull();
    expect(role).not.toBeNull();
  });
});
