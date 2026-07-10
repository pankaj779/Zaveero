import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../database/database.module';
import { AUTH_REPOSITORY, USER_REPOSITORY } from './constants/injection-tokens';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { AuthService } from './services/auth.service';

@Module({
  imports: [DatabaseModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useClass: PrismaAuthRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
  ],
  exports: [AuthService, AUTH_REPOSITORY, USER_REPOSITORY, JwtAuthGuard, RolesGuard, PermissionsGuard],
})
export class AuthModule {}
