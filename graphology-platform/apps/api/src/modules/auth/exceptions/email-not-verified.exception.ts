import { ForbiddenException } from '@nestjs/common';

export class EmailNotVerifiedException extends ForbiddenException {
  constructor(message = 'Email address has not been verified.') {
    super({
      message,
      errorCode: 'EMAIL_NOT_VERIFIED',
    });
  }
}
