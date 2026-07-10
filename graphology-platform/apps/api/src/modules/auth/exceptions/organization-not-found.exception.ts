import { InternalServerErrorException } from '@nestjs/common';

export class OrganizationNotFoundException extends InternalServerErrorException {
  constructor(
    message = 'Default organization is not configured. Registration cannot proceed.',
  ) {
    super({
      message,
      errorCode: 'ORGANIZATION_NOT_FOUND',
    });
  }
}
