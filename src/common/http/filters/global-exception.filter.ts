import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiResponseBuilder } from '../api-response.builder.js';

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
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const context = host.switchToHttp();
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
      this.logger.error(
        `Unhandled HTTP error ${statusCode}: ${this.getLogMessage(exception)}`,
        exception instanceof Error ? exception.stack : undefined,
      );
    }

    return response.status(statusCode).json(body);
  }

  private getLogMessage(exception: unknown): string {
    if (exception instanceof Error) return `${exception.name}: ${exception.message}`;
    return String(exception);
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
