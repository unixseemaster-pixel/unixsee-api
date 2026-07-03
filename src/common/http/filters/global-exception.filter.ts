import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

import { ApiResponseBuilder } from '../api-response.builder.js';
import { createAppLogger } from '../../logging/app-logger.js';

const logger = createAppLogger('GlobalExceptionFilter');

type NormalizedException = {
  code?: string;
  message?: string;
  details?: unknown;
};

type ExceptionResponse = {
  statusCode?: number;
  message?: string | string[];
  error?: string;
  code?: string;
  details?: unknown;
  [key: string]: unknown;
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
    const request = context.getRequest<Request>();
    const response = context.getResponse<Response>();

    const statusCode = this.getStatusCode(exception);
    const normalized = this.normalize(exception);

    const body = ApiResponseBuilder.error(
      statusCode,
      normalized.message,
      normalized.code,
      normalized.details,
    );

    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      logger.error('http.exception.unhandled', exception as Error, {
        method: request.method,
        path: request.originalUrl ?? request.url,
        statusCode,
      });
    }

    return response.status(statusCode).json(body);
  }

  private getStatusCode(exception: unknown): number {
    if (exception instanceof HttpException) {
      return exception.getStatus();
    }

    return HttpStatus.INTERNAL_SERVER_ERROR;
  }

  private normalize(exception: unknown): NormalizedException {
    if (exception instanceof HttpException) {
      const res = exception.getResponse();

      if (typeof res === 'string') {
        return {
          message: res,
        };
      }

      const body = res as ExceptionResponse;

      if (Array.isArray(body.message)) {
        return {
          code: 'VALIDATION_ERROR',
          message: body.message[0],
          details: {
            messages: body.message,
          },
        };
      }

      return {
        code: body.code,
        message: body.message || body.error,
        details: body.details ?? body,
      };
    }

    return {
      details: this.getInternalErrorDetails(exception),
    };
  }

  private getInternalErrorDetails(exception: unknown): unknown {
    if (process.env.NODE_ENV === 'production') {
      return undefined;
    }

    if (exception instanceof Error) {
      return {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
      };
    }

    return exception;
  }
}
