import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type {
  AuthenticatedUser,
  AuthenticatedUserProperty,
} from '../types/authenticated-user.type';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';

/**
 * Extracts the authenticated user (or a single property) from the request.
 *
 * @example @CurrentUser()
 * @example @CurrentUser('id')
 * @example @CurrentUser('email')
 */
export const CurrentUser = createParamDecorator(
  (
    property: AuthenticatedUserProperty | undefined,
    context: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[AuthenticatedUserProperty] | undefined => {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const user = request.user;

    if (!user) {
      return undefined;
    }

    if (property) {
      return user[property];
    }

    return user;
  },
);
