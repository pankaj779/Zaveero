import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import type { AuthUserRecord } from '../interfaces/auth-repository.interface';
import type { UserRepository } from '../interfaces/user-repository.interface';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  public readonly marker = 'user-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  async findByEmail(email: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        passwordHash: true,
        emailVerified: true,
        isActive: true,
        deletedAt: true,
      },
    });

    return user;
  }

  async findByPhone(phone: string): Promise<AuthUserRecord | null> {
    const user = await this.prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        passwordHash: true,
        emailVerified: true,
        isActive: true,
        deletedAt: true,
      },
    });

    return user;
  }
}
