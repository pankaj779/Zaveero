import { InternalServerErrorException } from '@nestjs/common';

export class DefaultRoleNotFoundException extends InternalServerErrorException {
  constructor(message = 'Default registration role is not configured.') {
    super({
      message,
      errorCode: 'DEFAULT_ROLE_NOT_FOUND',
    });
  }
}
