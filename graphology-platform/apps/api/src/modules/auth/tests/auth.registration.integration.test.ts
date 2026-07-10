import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { verify } from 'argon2';
import { prisma } from '@graphology/database';
import {
  DEFAULT_ORGANIZATION,
  DEFAULT_REGISTRATION_ROLE,
} from '../constants/auth.constants';
import { EmailAlreadyExistsException } from '../exceptions';
import { PrismaAuthRepository } from '../repositories/prisma-auth.repository';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import { AuthService } from '../services/auth.service';

const shouldRunDatabaseTests = process.env.RUN_DATABASE_TESTS === 'true';

describe.runIf(shouldRunDatabaseTests)('Auth registration integration', () => {
  const authRepository = new PrismaAuthRepository(prisma);
  const userRepository = new PrismaUserRepository(prisma);
  const service = new AuthService(authRepository, userRepository);

  const suffix = Date.now().toString();
  const email = `register-${suffix}@example.com`;
  const phone = `+9198${suffix.slice(-8)}`;
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
      password: 'SecurePass1!',
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
    expect(user.passwordHash).not.toBe('SecurePass1!');
    await expect(verify(user.passwordHash, 'SecurePass1!')).resolves.toBe(true);

    expect(user.organizationMembers).toHaveLength(1);
    expect(user.organizationMembers[0]?.organization.slug).toBe(DEFAULT_ORGANIZATION.slug);
    expect(user.organizationMembers[0]?.status).toBe('ACTIVE');

    expect(user.userRoles).toHaveLength(1);
    expect(user.userRoles[0]?.role.name).toBe(DEFAULT_REGISTRATION_ROLE);
  });

  it('rejects duplicate email registration', async () => {
    await expect(
      service.register({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email,
        password: 'SecurePass1!',
      }),
    ).rejects.toBeInstanceOf(EmailAlreadyExistsException);
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
            passwordHash: '$argon2id$test',
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
