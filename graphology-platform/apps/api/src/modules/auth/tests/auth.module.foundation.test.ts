import { describe, expect, it } from 'vitest';
import {
  AUTH_COOKIE_NAMES,
  AUTH_EXPIRATION_NAMES,
  AUTH_PERMISSIONS,
  AUTH_REPOSITORY,
  AUTHORIZATION_REPOSITORY,
  AUTH_ROLES,
  AUTH_TOKEN_TYPES,
  USER_REPOSITORY,
} from '../constants';
import { AuthMapper } from '../mappers/auth.mapper';
import { PrismaAuthRepository } from '../repositories/prisma-auth.repository';
import { PrismaAuthorizationRepository } from '../repositories/prisma-authorization.repository';
import { PrismaUserRepository } from '../repositories/prisma-user.repository';
import {
  AccountDisabledException,
  EmailAlreadyExistsException,
  EmailNotVerifiedException,
  InsufficientPermissionsException,
  InsufficientRolesException,
  InvalidCredentialsException,
  OrganizationMembershipRequiredException,
  TokenExpiredException,
  TokenInvalidException,
  UnauthenticatedException,
} from '../exceptions';
import { RegisterDto } from '../dto/register.dto';
import { LoginDto } from '../dto/login.dto';
import { ForgotPasswordDto } from '../dto/forgot-password.dto';
import { ResetPasswordDto } from '../dto/reset-password.dto';
import { VerifyEmailDto } from '../dto/verify-email.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';
import { RolesGuard } from '../guards/roles.guard';
import { PermissionsGuard } from '../guards/permissions.guard';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { RefreshStrategy } from '../strategies/refresh.strategy';
import { GoogleOAuthStrategy } from '../strategies/google-oauth.strategy';
import { ROLES_KEY, PERMISSIONS_KEY } from '../decorators';
import { PermissionLookupService } from '../services/permission-lookup.service';

describe('auth module foundation', () => {
  it('exposes injection tokens for repositories', () => {
    expect(AUTH_REPOSITORY).toBeTypeOf('symbol');
    expect(USER_REPOSITORY).toBeTypeOf('symbol');
    expect(AUTHORIZATION_REPOSITORY).toBeTypeOf('symbol');
  });

  it('defines auth constants for tokens, cookies, roles, and permissions', () => {
    expect(AUTH_TOKEN_TYPES.access).toBe('access');
    expect(AUTH_TOKEN_TYPES.refresh).toBe('refresh');
    expect(AUTH_COOKIE_NAMES.accessToken).toBe('graphology_access_token');
    expect(AUTH_EXPIRATION_NAMES.accessToken).toBe('JWT_EXPIRES_IN');
    expect(AUTH_EXPIRATION_NAMES.refreshToken).toBe('REFRESH_TOKEN_EXPIRES_IN');
    expect(AUTH_ROLES.admin).toBe('Admin');
    expect(AUTH_PERMISSIONS.courseCreate).toBe('course.create');
  });

  it('constructs repository implementations with markers', () => {
    const prisma = {} as never;
    const authRepo = new PrismaAuthRepository(prisma);
    const userRepo = new PrismaUserRepository(prisma);
    const authorizationRepo = new PrismaAuthorizationRepository(prisma);

    expect(authRepo.marker).toBe('auth-repository');
    expect(userRepo.marker).toBe('user-repository');
    expect(authorizationRepo.marker).toBe('authorization-repository');
  });

  it('defines custom auth exceptions without throwing them', () => {
    expect(new InvalidCredentialsException()).toBeInstanceOf(Error);
    expect(new EmailAlreadyExistsException()).toBeInstanceOf(Error);
    expect(new AccountDisabledException()).toBeInstanceOf(Error);
    expect(new EmailNotVerifiedException()).toBeInstanceOf(Error);
    expect(new TokenExpiredException()).toBeInstanceOf(Error);
    expect(new TokenInvalidException()).toBeInstanceOf(Error);
    expect(new UnauthenticatedException()).toBeInstanceOf(Error);
    expect(new InsufficientPermissionsException()).toBeInstanceOf(Error);
    expect(new InsufficientRolesException()).toBeInstanceOf(Error);
    expect(new OrganizationMembershipRequiredException()).toBeInstanceOf(Error);
  });

  it('exposes DTO placeholder classes', () => {
    expect(RegisterDto).toBeTypeOf('function');
    expect(LoginDto).toBeTypeOf('function');
    expect(ForgotPasswordDto).toBeTypeOf('function');
    expect(ResetPasswordDto).toBeTypeOf('function');
    expect(VerifyEmailDto).toBeTypeOf('function');
    expect(RefreshTokenDto).toBeTypeOf('function');
  });

  it('provides guard classes and strategy placeholders', () => {
    expect(JwtAuthGuard).toBeTypeOf('function');
    expect(RolesGuard).toBeTypeOf('function');
    expect(PermissionsGuard).toBeTypeOf('function');
    expect(PermissionLookupService).toBeTypeOf('function');
    expect(new JwtStrategy().name).toBe('jwt');
    expect(new RefreshStrategy().name).toBe('jwt-refresh');
    expect(new GoogleOAuthStrategy().name).toBe('google');
  });

  it('exports decorator metadata keys', () => {
    expect(ROLES_KEY).toBe('roles');
    expect(PERMISSIONS_KEY).toBe('permissions');
  });

  it('maps auth user records to authenticated user shape', () => {
    const mapped = AuthMapper.toAuthenticatedUser(
      { id: 'user-1', email: 'ada@example.com' },
      [AUTH_ROLES.admin],
    );

    expect(mapped).toEqual({
      id: 'user-1',
      email: 'ada@example.com',
      roles: [AUTH_ROLES.admin],
      permissions: [],
      organizationIds: [],
    });
  });
});
