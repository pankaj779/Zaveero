import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Placeholder role authorization guard.
 * Implementation will be added in a later authentication task.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}
