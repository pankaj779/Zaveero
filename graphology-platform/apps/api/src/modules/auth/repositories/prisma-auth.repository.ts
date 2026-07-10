import { Inject, Injectable } from '@nestjs/common';
import type { PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from '../../../database/database.constants';
import type { AuthRepository } from '../interfaces/auth-repository.interface';

@Injectable()
export class PrismaAuthRepository implements AuthRepository {
  public readonly marker = 'auth-repository' as const;

  constructor(
    @Inject(PRISMA_CLIENT)
    private readonly prisma: PrismaClient,
  ) {}

  /**
   * Prisma client is injected for future auth persistence methods.
   * No business methods are implemented in this foundation task.
   */
  protected get client(): PrismaClient {
    return this.prisma;
  }
}
