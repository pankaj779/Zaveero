import { ForbiddenException } from '@nestjs/common';

export class InsufficientPermissionsException extends ForbiddenException {
  constructor(message = 'You do not have permission to perform this action.') {
    super({
      message,
      errorCode: 'INSUFFICIENT_PERMISSIONS',
    });
  }
}
