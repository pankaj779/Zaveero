import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import { map, type Observable } from 'rxjs';
import type {
  ApiSuccessResponse,
  ControllerSuccessPayload,
} from '../interfaces/api-response.interface';

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiSuccessResponse<T>>
{
  intercept(
    _context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiSuccessResponse<T>> {
    return next.handle().pipe(
      map((payload) => {
        if (this.isAlreadyWrapped(payload)) {
          return payload;
        }

        if (this.hasControllerPayload(payload)) {
          return {
            success: true as const,
            message: payload.message ?? 'Operation completed successfully.',
            data: payload.data,
            timestamp: new Date().toISOString(),
          };
        }

        return {
          success: true as const,
          message: 'Operation completed successfully.',
          data: payload,
          timestamp: new Date().toISOString(),
        };
      }),
    );
  }

  private isAlreadyWrapped(payload: unknown): payload is ApiSuccessResponse<T> {
    if (typeof payload !== 'object' || payload === null) {
      return false;
    }

    const record = payload as Record<string, unknown>;
    return (
      record.success === true &&
      'data' in record &&
      'message' in record &&
      'timestamp' in record
    );
  }

  private hasControllerPayload(
    payload: unknown,
  ): payload is ControllerSuccessPayload<T> {
    return (
      typeof payload === 'object' &&
      payload !== null &&
      'data' in payload &&
      !('success' in payload)
    );
  }
}
