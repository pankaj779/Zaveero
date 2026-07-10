import { ConflictException } from '@nestjs/common';

export class EmailAlreadyExistsException extends ConflictException {
  constructor(message = 'An account with this email already exists.') {
    super({
      message,
      errorCode: 'EMAIL_ALREADY_EXISTS',
    });
  }
}
