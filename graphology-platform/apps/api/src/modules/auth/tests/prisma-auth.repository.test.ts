import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DefaultRoleNotFoundException,
  OrganizationNotFoundException,
} from '../exceptions';
import { PrismaAuthRepository } from '../repositories/prisma-auth.repository';

describe('PrismaAuthRepository.registerUser', () => {
  const organization = { id: 'org-1', name: 'Graphology Academy' };
  const role = { id: 'role-1' };
  const user = { id: 'user-1', email: 'ada@example.com' };

  let findOrganization: ReturnType<typeof vi.fn>;
  let findRole: ReturnType<typeof vi.fn>;
  let createUser: ReturnType<typeof vi.fn>;
  let createMembership: ReturnType<typeof vi.fn>;
  let createUserRole: ReturnType<typeof vi.fn>;
  let transaction: ReturnType<typeof vi.fn>;
  let repository: PrismaAuthRepository;

  beforeEach(() => {
    findOrganization = vi.fn().mockResolvedValue(organization);
    findRole = vi.fn().mockResolvedValue(role);
    createUser = vi.fn().mockResolvedValue(user);
    createMembership = vi.fn().mockResolvedValue({ id: 'member-1' });
    createUserRole = vi.fn().mockResolvedValue({ id: 'user-role-1' });

    const tx = {
      organization: { findUnique: findOrganization },
      role: { findUnique: findRole },
      user: { create: createUser },
      organizationMember: { create: createMembership },
      userRole: { create: createUserRole },
    };

    transaction = vi.fn(async (callback: (client: typeof tx) => Promise<unknown>) =>
      callback(tx),
    );

    repository = new PrismaAuthRepository({ $transaction: transaction } as never);
  });

  it('creates user, organization membership, and student role in one transaction', async () => {
    const result = await repository.registerUser({
      firstName: 'Ada',
      lastName: 'Lovelace',
      email: 'ada@example.com',
      passwordHash: '$argon2id$hashed',
      organizationSlug: 'graphology-academy',
      roleName: 'Student',
    });

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(createUser).toHaveBeenCalledWith({
      data: {
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        phone: null,
        passwordHash: '$argon2id$hashed',
        emailVerified: false,
      },
      select: {
        id: true,
        email: true,
      },
    });
    expect(createMembership).toHaveBeenCalledWith({
      data: {
        organizationId: 'org-1',
        userId: 'user-1',
        status: 'ACTIVE',
      },
    });
    expect(createUserRole).toHaveBeenCalledWith({
      data: {
        userId: 'user-1',
        roleId: 'role-1',
      },
    });
    expect(result).toEqual({
      userId: 'user-1',
      email: 'ada@example.com',
      organizationName: 'Graphology Academy',
    });
  });

  it('fails when default organization is missing', async () => {
    findOrganization.mockResolvedValue(null);

    await expect(
      repository.registerUser({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        passwordHash: '$argon2id$hashed',
        organizationSlug: 'graphology-academy',
        roleName: 'Student',
      }),
    ).rejects.toBeInstanceOf(OrganizationNotFoundException);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('fails when default role is missing', async () => {
    findRole.mockResolvedValue(null);

    await expect(
      repository.registerUser({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        passwordHash: '$argon2id$hashed',
        organizationSlug: 'graphology-academy',
        roleName: 'Student',
      }),
    ).rejects.toBeInstanceOf(DefaultRoleNotFoundException);

    expect(createUser).not.toHaveBeenCalled();
  });

  it('propagates mid-transaction failures for rollback', async () => {
    createUserRole.mockRejectedValue(new Error('role assignment failed'));

    await expect(
      repository.registerUser({
        firstName: 'Ada',
        lastName: 'Lovelace',
        email: 'ada@example.com',
        passwordHash: '$argon2id$hashed',
        organizationSlug: 'graphology-academy',
        roleName: 'Student',
      }),
    ).rejects.toThrow('role assignment failed');

    expect(createUser).toHaveBeenCalled();
    expect(createMembership).toHaveBeenCalled();
    expect(createUserRole).toHaveBeenCalled();
  });
});
