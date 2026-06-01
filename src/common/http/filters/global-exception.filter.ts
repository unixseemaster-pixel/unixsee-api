import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
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

// import {
//   ArgumentsHost,
//   Catch,
//   ExceptionFilter,
//   HttpException,
//   HttpStatus,
// } from '@nestjs/common';

// import { ApiResponseBuilder } from '../api-response.builder.js';

// @Catch()
// export class GlobalExceptionFilter implements ExceptionFilter {
//   catch(exception: unknown, host: ArgumentsHost) {
//     const context = host.switchToHttp();
//     const response = context.getResponse();

//     const statusCode = this.getStatusCode(exception);

//     const error = this.normalize(exception);

//     const body = ApiResponseBuilder['build'](statusCode, null, error);

//     return response.status(statusCode).json(body);
//   }

//   private getStatusCode(exception: unknown): number {
//     if (exception instanceof HttpException) {
//       return exception.getStatus();
//     }

//     return HttpStatus.INTERNAL_SERVER_ERROR;
//   }

//   private normalize(exception: unknown) {
//     if (exception instanceof HttpException) {
//       const res = exception.getResponse();

//       if (typeof res === 'string') {
//         return {
//           code: 'HTTP_EXCEPTION',
//           message: res,
//         };
//       }

//       const message = Array.isArray((res as any)?.message)
//         ? (res as any).message[0]
//         : (res as any)?.message;

//       return {
//         code: (res as any)?.code || 'HTTP_EXCEPTION',
//         message: message || 'Request failed',
//         details: res,
//       };
//     }

//     return {
//       code: 'INTERNAL_SERVER_ERROR',
//       message: 'Unexpected server error',
//       details: exception instanceof Error ? exception.message : exception,
//     };
//   }
// }
