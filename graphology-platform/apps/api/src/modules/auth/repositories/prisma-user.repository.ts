import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import type { AuthUserRecord } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  passwordHash: true,
  emailVerified: true,
  isActive: true,
  deletedAt: true,
} as const;

@Injectable()
export class PrismaUserRepository implements UserRepository {
  public readonly marker = 'user-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { email },
      select: userSelect,
    });
  }

  async findByPhone(phone: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { phone },
      select: userSelect,
    });
  }

  async findById(id: string): Promise<AuthUserRecord | null> {
    return this.prisma.user.findUnique({
      where: { id },
      select: userSelect,
    });
  }

  async markEmailVerified(userId: string): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { emailVerified: true },
    });
  }
}
