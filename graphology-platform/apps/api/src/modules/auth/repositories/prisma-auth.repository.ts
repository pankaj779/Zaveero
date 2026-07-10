import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import {
  DefaultRoleNotFoundException,
  EmailAlreadyExistsException,
  OrganizationNotFoundException,
  PhoneAlreadyExistsException,
} from '../exceptions';
import type {
  AuthRepository,
  RegisterUserInput,
  RegisterUserResult,
} from '../interfaces/auth-repository.interface';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  public readonly marker = 'auth-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async registerUser(input: RegisterUserInput): Promise<RegisterUserResult> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        const organization = await tx.organization.findUnique({
          where: { slug: input.organizationSlug },
          select: { id: true, name: true },
        });

        if (!organization) {
          throw new OrganizationNotFoundException();
        }

        const role = await tx.role.findUnique({
          where: { name: input.roleName },
          select: { id: true },
        });

        if (!role) {
          throw new DefaultRoleNotFoundException();
        }

        const user = await tx.user.create({
          data: {
            firstName: input.firstName,
            lastName: input.lastName,
            email: input.email,
            phone: input.phone ?? null,
            passwordHash: input.passwordHash,
            emailVerified: false,
          },
          select: {
            id: true,
            email: true,
          },
        });

        await tx.organizationMember.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            status: 'ACTIVE',
          },
        });

        await tx.userRole.create({
          data: {
            userId: user.id,
            roleId: role.id,
          },
        });

        return {
          userId: user.id,
          email: user.email,
          organizationName: organization.name,
        };
      });
    } catch (error: unknown) {
      this.rethrowUniqueConstraint(error);
      throw error;
    }
  }

  private rethrowUniqueConstraint(error: unknown): void {
    if (!this.isUniqueConstraintError(error)) {
      return;
    }

    const target = error.meta?.target;
    const fields = Array.isArray(target)
      ? target.map((item) => String(item).toLowerCase())
      : typeof target === 'string'
        ? [target.toLowerCase()]
        : [];

    if (fields.some((field) => field.includes('phone'))) {
      throw new PhoneAlreadyExistsException();
    }

    throw new EmailAlreadyExistsException();
  }

  private isUniqueConstraintError(
    error: unknown,
  ): error is { code: string; meta?: { target?: unknown } } {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return false;
    }

    return error.code === 'P2002';
  }
}
