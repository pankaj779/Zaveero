import { ForbiddenException } from '@nestjs/common';

export class AccountDisabledException extends ForbiddenException {
  constructor(message = 'This account has been disabled.') {
    super({
      message,
      errorCode: 'ACCOUNT_DISABLED',
    });
  }
}
