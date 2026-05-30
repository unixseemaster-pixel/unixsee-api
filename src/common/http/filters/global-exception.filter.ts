import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';

import { ApiResponseBuilder } from '../api-response.builder.js';

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const response = context.getResponse();

    const statusCode = this.getStatusCode(exception);

    const error = this.normalize(exception);

    const body = ApiResponseBuilder['build'](statusCode, null, error);

    return response.status(statusCode).json(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalize(exception: unknown) {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return {
          code: 'HTTP_EXCEPTION',
          message: res,
        };
      }

      return {
        code: (res as any)?.code || 'HTTP_EXCEPTION',
        message: (res as any)?.message || 'Request failed',
        details: res,
      };
    }

    return {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
      details: exception instanceof Error ? exception.message : exception,
    };
  }
}
