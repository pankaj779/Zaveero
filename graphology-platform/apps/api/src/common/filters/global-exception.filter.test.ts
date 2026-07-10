import { ConflictException, type ArgumentsHost, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EmailAlreadyExistsException } from '../../modules/auth/exceptions/email-already-exists.exception';
import { GlobalExceptionFilter } from './global-exception.filter';

describe('GlobalExceptionFilter', () => {
  const filter = new GlobalExceptionFilter();
  const json = vi.fn();
  const status = vi.fn().mockReturnValue({ json });

  beforeEach(() => {
    json.mockReset();
    status.mockClear();
    status.mockReturnValue({ json });
  });

  it('formats HttpException responses consistently', () => {
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'GET',
          url: '/api/v1/health',
          headers: {},
          requestId: 'req-123',
        }),
      }),
    } as ArgumentsHost;

    filter.catch(new ConflictException('Invalid payload'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'Invalid payload',
        path: '/api/v1/health',
        requestId: 'req-123',
      }),
    );
  });

  it('maps custom errorCode from auth exceptions', () => {
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({
          method: 'POST',
          url: '/api/v1/auth/register',
          headers: {},
          requestId: 'req-456',
        }),
      }),
    } as ArgumentsHost;

    filter.catch(new EmailAlreadyExistsException(), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.CONFLICT);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 409,
        message: 'An account with this email already exists.',
        errorCode: 'EMAIL_ALREADY_EXISTS',
        path: '/api/v1/auth/register',
      }),
    );
  });
});
