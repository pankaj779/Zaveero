import { UnauthorizedException } from '@nestjs/common';

export class TokenExpiredException extends UnauthorizedException {
  constructor(message = 'Authentication token has expired.') {
    super({
      message,
      errorCode: 'TOKEN_EXPIRED',
    });
  }
}
