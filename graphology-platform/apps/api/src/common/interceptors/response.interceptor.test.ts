import { type CallHandler, type ExecutionContext } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { ResponseInterceptor } from './response.interceptor';

describe('ResponseInterceptor', () => {
  const interceptor = new ResponseInterceptor();

  it('wraps plain payloads in the standard success envelope', async () => {
    const handler = {
      handle: () => of({ status: 'healthy' }),
    } as CallHandler;

    const result = await lastValueFrom(
      interceptor.intercept({} as ExecutionContext, handler),
    );

    expect(result.success).toBe(true);
    expect(result.message).toBe('Operation completed successfully.');
    expect(result.data).toEqual({ status: 'healthy' });
    expect(() => new Date(result.timestamp)).not.toThrow();
  });

  it('preserves controller message and data payloads', async () => {
    const handler = {
      handle: () => of({ message: 'Health check passed.', data: { status: 'healthy' } }),
    } as CallHandler;

    const result = await lastValueFrom(
      interceptor.intercept({} as ExecutionContext, handler),
    );

    expect(result).toEqual(
      expect.objectContaining({
        success: true,
        message: 'Health check passed.',
        data: { status: 'healthy' },
      }),
    );
  });
});
