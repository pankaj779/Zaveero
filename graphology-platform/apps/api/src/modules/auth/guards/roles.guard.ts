import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthRoleName } from '../constants/auth.constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import {
  InsufficientRolesException,
  UnauthenticatedException,
} from '../exceptions';
import { PermissionLookupService } from '../services/permission-lookup.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

/**
 * Enforces @Roles(...) metadata. Requires JwtAuthGuard to run first.
 * Matching is OR: the user needs any one of the listed roles.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionLookupService: PermissionLookupService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<AuthRoleName[] | undefined>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthenticatedException();
    }

    if (!this.permissionLookupService.hasAnyRole(user.roles, requiredRoles)) {
      throw new InsufficientRolesException();
    }

    return true;
  }
}
