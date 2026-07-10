import { BadRequestException, type ArgumentsHost, HttpStatus } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

    filter.catch(new BadRequestException('Invalid payload'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 400,
        message: 'Invalid payload',
        path: '/api/v1/health',
        requestId: 'req-123',
      }),
    );
  });
});
