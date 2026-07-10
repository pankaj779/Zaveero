import { UnauthorizedException } from '@nestjs/common';

export class UnauthenticatedException extends UnauthorizedException {
  constructor(message = 'Authentication is required.') {
    super({
      message,
      errorCode: 'UNAUTHENTICATED',
    });
  }
}
