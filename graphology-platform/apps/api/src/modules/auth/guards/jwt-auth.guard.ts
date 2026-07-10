import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AUTH_TOKEN_TYPES } from '../constants/auth.constants';
import {
  AccountDisabledException,
  OrganizationMembershipRequiredException,
  TokenExpiredException,
  TokenInvalidException,
  UnauthenticatedException,
} from '../exceptions';
import { AuthMapper } from '../mappers/auth.mapper';
import { PermissionLookupService } from '../services/permission-lookup.service';
import type { AccessTokenClaims } from '../services/token.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import { extractBearerToken } from '../utils/bearer-token.util';

/**
 * Validates the access JWT, loads authorization context, and attaches the user.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly permissionLookupService: PermissionLookupService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const token =
      request.accessToken ?? extractBearerToken(request.headers.authorization);

    if (!token) {
      throw new UnauthenticatedException();
    }

    const claims = await this.verifyAccessToken(token);
    const contextRecord = await this.permissionLookupService.getAuthorizationContext(
      claims.sub,
    );

    if (!contextRecord) {
      throw new TokenInvalidException('Authentication token is invalid.');
    }

    if (!contextRecord.isActive || contextRecord.deletedAt !== null) {
      throw new AccountDisabledException();
    }

    if (contextRecord.activeOrganizationIds.length === 0) {
      throw new OrganizationMembershipRequiredException();
    }

    request.user = AuthMapper.toAuthenticatedUser(contextRecord);
    return true;
  }

  private async verifyAccessToken(token: string): Promise<AccessTokenClaims> {
    try {
      const payload = await this.jwtService.verifyAsync<Partial<AccessTokenClaims>>(token);

      if (
        payload.type !== AUTH_TOKEN_TYPES.access ||
        typeof payload.sub !== 'string' ||
        typeof payload.email !== 'string'
      ) {
        throw new TokenInvalidException();
      }

      return {
        sub: payload.sub,
        email: payload.email,
        type: AUTH_TOKEN_TYPES.access,
      };
    } catch (error) {
      if (error instanceof TokenInvalidException) {
        throw error;
      }

      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new TokenExpiredException('Access token has expired.');
      }

      throw new TokenInvalidException();
    }
  }
}
