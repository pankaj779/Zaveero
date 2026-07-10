import { ConflictException } from '@nestjs/common';

export class PhoneAlreadyExistsException extends ConflictException {
  constructor(message = 'An account with this phone number already exists.') {
    super({
      message,
      errorCode: 'PHONE_ALREADY_EXISTS',
    });
  }
}
