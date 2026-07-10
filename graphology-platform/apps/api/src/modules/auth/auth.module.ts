import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { EnvConfig } from '../../config/env.schema';
import { DatabaseModule } from '../../database/database.module';
import { EmailModule } from '../email/email.module';
import { AUTH_REPOSITORY, USER_REPOSITORY } from './constants/injection-tokens';
import { AuthController } from './controllers/auth.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { AuthService } from './services/auth.service';
import { TokenService } from './services/token.service';

@Module({
  imports: [
    DatabaseModule,
    EmailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService<EnvConfig, true>) => {
        const expiresIn = configService.get('JWT_EXPIRES_IN', { infer: true });
        return {
          secret: configService.get('JWT_SECRET', { infer: true }),
          signOptions: {
            expiresIn: expiresIn as `${number}${'s' | 'm' | 'h' | 'd'}`,
          },
        };
      },
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    TokenService,
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
  exports: [
    AuthService,
    TokenService,
    AUTH_REPOSITORY,
    USER_REPOSITORY,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    JwtModule,
  ],
})
export class AuthModule {}
