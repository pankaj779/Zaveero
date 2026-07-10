import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Response } from 'express';
import type { AuthenticatedRequest } from '../types/authenticated-request.type';
import { extractBearerToken } from '../utils/bearer-token.util';

/**
 * Extracts a Bearer access token onto the request for downstream JWT auth.
 * Does not authenticate or authorize — JwtAuthGuard performs validation.
 */
@Injectable()
export class AuthorizationMiddleware implements NestMiddleware {
  use(req: AuthenticatedRequest, _res: Response, next: NextFunction): void {
    const token = extractBearerToken(req.headers.authorization);
    if (token) {
      req.accessToken = token;
    }
    next();
  }
}
