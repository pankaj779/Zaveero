import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import type { UserRepository } from '../interfaces/user-repository.interface';

@Injectable()
export class PrismaUserRepository implements UserRepository {
  public readonly marker = 'user-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * Prisma client is injected for future user persistence methods.
   * No business methods are implemented in this foundation task.
   */
  protected get client(): PrismaClient {
    return this.prisma;
  }
}
