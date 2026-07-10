import { UnauthorizedException } from '@nestjs/common';

export class TokenInvalidException extends UnauthorizedException {
  constructor(message = 'Authentication token is invalid.') {
    super({
      message,
      errorCode: 'TOKEN_INVALID',
    });
  }
}
