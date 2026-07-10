import { Global, Module } from '@nestjs/common';
import { prisma, type PrismaClient } from '@graphology/database';
import { PRISMA_CLIENT } from './database.constants';

@Global()
@Module({
  providers: [
    {
      provide: PRISMA_CLIENT,
      useFactory: (): PrismaClient => prisma,
    },
  ],
  exports: [PRISMA_CLIENT],
})
export class DatabaseModule {}
