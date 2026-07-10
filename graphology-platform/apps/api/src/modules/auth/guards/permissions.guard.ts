import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Placeholder permission authorization guard.
 * Implementation will be added in a later authentication task.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}
