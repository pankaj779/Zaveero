import { ForbiddenException } from '@nestjs/common';

export class InsufficientRolesException extends ForbiddenException {
  constructor(message = 'You do not have the required role to perform this action.') {
    super({
      message,
      errorCode: 'INSUFFICIENT_ROLES',
    });
  }
}
