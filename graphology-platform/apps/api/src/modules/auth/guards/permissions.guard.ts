import {
  type CanActivate,
  type ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { AuthPermissionName } from '../constants/auth.constants';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import {
  InsufficientPermissionsException,
  UnauthenticatedException,
} from '../exceptions';
import { PermissionLookupService } from '../services/permission-lookup.service';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

/**
 * Enforces @Permissions(...) metadata. Requires JwtAuthGuard to run first.
 * Matching is AND: the user must hold every listed permission.
 * Permissions are loaded via PermissionLookupService (repository-backed).
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly permissionLookupService: PermissionLookupService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredPermissions = this.reflector.getAllAndOverride<
      AuthPermissionName[] | undefined
    >(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      throw new UnauthenticatedException();
    }

    const permissions = await this.permissionLookupService.getPermissionsForUser(user.id);

    if (
      !this.permissionLookupService.hasAllPermissions(permissions, requiredPermissions)
    ) {
      throw new InsufficientPermissionsException();
    }

    return true;
  }
}
