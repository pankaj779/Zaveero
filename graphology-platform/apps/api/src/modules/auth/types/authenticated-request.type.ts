import type { Request } from 'express';
import type { AuthenticatedUser } from '../types/authenticated-user.type';

/**
 * HTTP request enriched by authorization middleware and JWT guard.
 */
export interface AuthenticatedRequest extends Request {
  accessToken?: string;
  user?: AuthenticatedUser;
}
