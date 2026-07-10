import { type MiddlewareConsumer, Module, type NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import type { EnvConfig } from '../../config/env.schema';
import { DatabaseModule } from '../../database/database.module';
import { EmailModule } from '../email/email.module';
import {
  AUTH_REPOSITORY,
  AUTHORIZATION_REPOSITORY,
  USER_REPOSITORY,
} from './constants/injection-tokens';
import { AuthController } from './controllers/auth.controller';
import { RbacTestController } from './controllers/rbac-test.controller';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { PermissionsGuard } from './guards/permissions.guard';
import { RolesGuard } from './guards/roles.guard';
import { AuthorizationMiddleware } from './middleware/authorization.middleware';
import { PrismaAuthRepository } from './repositories/prisma-auth.repository';
import { PrismaAuthorizationRepository } from './repositories/prisma-authorization.repository';
import { PrismaUserRepository } from './repositories/prisma-user.repository';
import { AuthService } from './services/auth.service';
import { PermissionLookupService } from './services/permission-lookup.service';
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
  controllers: [AuthController, RbacTestController],
  providers: [
    AuthService,
    TokenService,
    PermissionLookupService,
    {
      provide: AUTH_REPOSITORY,
      useClass: PrismaAuthRepository,
    },
    {
      provide: USER_REPOSITORY,
      useClass: PrismaUserRepository,
    },
    {
      provide: AUTHORIZATION_REPOSITORY,
      useClass: PrismaAuthorizationRepository,
    },
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    AuthorizationMiddleware,
  ],
  exports: [
    AuthService,
    TokenService,
    PermissionLookupService,
    AUTH_REPOSITORY,
    USER_REPOSITORY,
    AUTHORIZATION_REPOSITORY,
    JwtAuthGuard,
    RolesGuard,
    PermissionsGuard,
    JwtModule,
  ],
})
export class AuthModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AuthorizationMiddleware).forRoutes(RbacTestController);
  }
}
