import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { REQUEST_ID_HEADER, type ApiErrorResponse } from '../interfaces/api-response.interface';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { requestId?: string }>();
    const isProduction = process.env.NODE_ENV === 'production';

    const statusCode =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse =
      exception instanceof HttpException ? exception.getResponse() : undefined;

    const { message, errorCode, errors } = this.normalizeException(
      exception,
      exceptionResponse,
      isProduction,
    );

    const requestId =
      request.requestId ??
      (typeof request.headers[REQUEST_ID_HEADER] === 'string'
        ? request.headers[REQUEST_ID_HEADER]
        : undefined);

    const body: ApiErrorResponse = {
      success: false,
      statusCode,
      message,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(errorCode ? { errorCode } : {}),
      ...(errors && errors.length > 0 ? { errors } : {}),
      ...(requestId ? { requestId } : {}),
    };

    if (statusCode >= 500) {
      this.logger.error(
        `requestId=${requestId ?? 'n/a'} method=${request.method} path=${request.url} status=${String(statusCode)} message=${message}`,
        exception instanceof Error && !isProduction ? exception.stack : undefined,
      );
    } else {
      this.logger.warn(
        `requestId=${requestId ?? 'n/a'} method=${request.method} path=${request.url} status=${String(statusCode)} message=${message}`,
      );
    }

    response.status(statusCode).json(body);
  }

  private normalizeException(
    exception: unknown,
    exceptionResponse: string | object | undefined,
    isProduction: boolean,
  ): { message: string; errorCode?: string; errors?: string[] } {
    if (typeof exceptionResponse === 'string') {
      return { message: exceptionResponse };
    }

    if (exceptionResponse && typeof exceptionResponse === 'object') {
      const payload = exceptionResponse as Record<string, unknown>;
      const messageValue = payload.message;
      const errors = Array.isArray(messageValue)
        ? messageValue.map((item) => String(item))
        : undefined;
      const message = errors
        ? 'Validation failed.'
        : typeof messageValue === 'string'
          ? messageValue
          : 'Request failed.';

      return {
        message,
        errorCode:
          typeof payload.errorCode === 'string'
            ? payload.errorCode
            : typeof payload.error === 'string'
              ? payload.error
              : undefined,
        errors,
      };
    }

    if (exception instanceof Error && !isProduction) {
      return { message: exception.message };
    }

    return { message: 'Internal server error.' };
  }
}
