import { Injectable, Logger, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestLoggingMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request & { requestId?: string }, res: Response, next: NextFunction): void {
    const startedAt = Date.now();
    const { method, originalUrl } = req;
    const requestId = req.requestId ?? 'n/a';

    res.on('finish', () => {
      const durationMs = Date.now() - startedAt;
      this.logger.log(
        `requestId=${requestId} method=${method} path=${originalUrl} status=${String(res.statusCode)} durationMs=${String(durationMs)}`,
      );
    });

    next();
  }
}
