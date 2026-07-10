import { ForbiddenException } from '@nestjs/common';

export class OrganizationMembershipRequiredException extends ForbiddenException {
  constructor(
    message = 'An active organization membership is required to access this resource.',
  ) {
    super({
      message,
      errorCode: 'ORGANIZATION_MEMBERSHIP_REQUIRED',
    });
  }
}
