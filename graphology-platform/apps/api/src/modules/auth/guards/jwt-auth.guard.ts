import { type CanActivate, type ExecutionContext, Injectable } from '@nestjs/common';

/**
 * Placeholder JWT authentication guard.
 * Implementation will be added in a later authentication task.
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(_context: ExecutionContext): boolean {
    return false;
  }
}
