// api-response.builder.ts
import { HttpStatus } from '@nestjs/common';
import { ApiResponse } from './api-response.types.js';

export class ApiResponseBuilder {
  private static readonly defaultErrorMap: Record<
    number,
    { code: string; message: string }
  > = {
    [HttpStatus.BAD_REQUEST]: {
      code: 'BAD_REQUEST',
      message: 'Bad request',
    },
    [HttpStatus.UNAUTHORIZED]: {
      code: 'UNAUTHORIZED',
      message: 'Unauthorized',
    },
    [HttpStatus.FORBIDDEN]: {
      code: 'FORBIDDEN',
      message: 'Forbidden',
    },
    [HttpStatus.NOT_FOUND]: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
    [HttpStatus.CONFLICT]: {
      code: 'CONFLICT',
      message: 'Conflict',
    },
    [HttpStatus.TOO_MANY_REQUESTS]: {
      code: 'TOO_MANY_REQUESTS',
      message: 'Too many requests',
    },
    [HttpStatus.INTERNAL_SERVER_ERROR]: {
      code: 'INTERNAL_SERVER_ERROR',
      message: 'Unexpected server error',
    },
  };

  private static build<T>(
    statusCode: number,
    message: string,
    data: T | null,
    error: ApiResponse<T>['error'],
    meta?: unknown,
  ): ApiResponse<T> {
    return {
      statusCode,
      success: statusCode < 400,
      message,
      data,
      error,
      ...(meta !== undefined ? { meta } : {}),
    };
  }

  static ok<T>(
    data: T,
    message = 'Request completed successfully',
    meta?: unknown,
  ): ApiResponse<T> {
    return this.build(HttpStatus.OK, message, data, null, meta);
  }

  static created<T>(
    data: T,
    message = 'Resource created successfully',
    meta?: unknown,
  ): ApiResponse<T> {
    return this.build(HttpStatus.CREATED, message, data, null, meta);
  }

  static error(
    statusCode: number,
    message?: string,
    code?: string,
    details?: unknown,
  ): ApiResponse<null> {
    const fallback = this.defaultErrorMap[statusCode] ?? {
      code: 'HTTP_EXCEPTION',
      message: 'Request failed',
    };

    const finalMessage = message ?? fallback.message;
    const finalCode = code ?? fallback.code;

    return this.build(statusCode, finalMessage, null, {
      code: finalCode,
      message: finalMessage,
      ...(details !== undefined ? { details } : {}),
    });
  }
}

// import { HttpStatus } from '@nestjs/common';
// import { ApiResponse } from './api-response.types.js';

// export class ApiResponseBuilder {
//   private static readonly defaultMessages = {
//     ok: 'Request completed successfully',
//     created: 'Resource created successfully',
//     badRequest: 'Bad request',
//     notFound: 'Resource not found',
//     unauthorized: 'Unauthorized',
//     forbidden: 'Forbidden',
//     tooManyRequests: 'Too many requests',
//   };

//   private static build<T>(
//     statusCode: number,
//     message: string,
//     data: T | null,
//     error: ApiResponse<T>['error'],
//     meta?: unknown,
//   ): ApiResponse<T> {
//     return {
//       statusCode,
//       success: statusCode < 400,
//       message,
//       data,
//       error,
//       ...(meta !== undefined ? { meta } : {}),
//     };
//   }

//   static ok<T>(
//     data: T,
//     message = this.defaultMessages.ok,
//     meta?: unknown,
//   ): ApiResponse<T> {
//     return this.build(HttpStatus.OK, message, data, null, meta);
//   }

//   static created<T>(
//     data: T,
//     message = this.defaultMessages.created,
//     meta?: unknown,
//   ): ApiResponse<T> {
//     return this.build(HttpStatus.CREATED, message, data, null, meta);
//   }

//   static badRequest(
//     message = this.defaultMessages.badRequest,
//     code = 'BAD_REQUEST',
//     details?: unknown,
//   ): ApiResponse<null> {
//     return this.build(HttpStatus.BAD_REQUEST, message, null, {
//       code,
//       message,
//       details,
//     });
//   }

//   static notFound(
//     message = this.defaultMessages.notFound,
//     code = 'NOT_FOUND',
//   ): ApiResponse<null> {
//     return this.build(HttpStatus.NOT_FOUND, message, null, {
//       code,
//       message,
//     });
//   }

//   static unauthorized(
//     message = this.defaultMessages.unauthorized,
//     code = 'UNAUTHORIZED',
//   ): ApiResponse<null> {
//     return this.build(HttpStatus.UNAUTHORIZED, message, null, {
//       code,
//       message,
//     });
//   }

//   static forbidden(
//     message = this.defaultMessages.forbidden,
//     code = 'FORBIDDEN',
//   ): ApiResponse<null> {
//     return this.build(HttpStatus.FORBIDDEN, message, null, {
//       code,
//       message,
//     });
//   }

//   static tooManyRequests(
//     message = this.defaultMessages.tooManyRequests,
//     code = 'TOO_MANY_REQUESTS',
//   ): ApiResponse<null> {
//     return this.build(HttpStatus.TOO_MANY_REQUESTS, message, null, {
//       code,
//       message,
//     });
//   }

//   static error(
//     statusCode: number,
//     message = this.getDefaultErrorMessage(statusCode),
//     code = this.getDefaultErrorCode(statusCode),
//     details?: unknown,
//   ): ApiResponse<null> {
//     return this.build(statusCode, message, null, {
//       code,
//       message,
//       ...(details !== undefined ? { details } : {}),
//     });
//   }

//   private static getDefaultErrorMessage(statusCode: number): string {
//     switch (statusCode) {
//       case HttpStatus.BAD_REQUEST:
//         return 'Bad request';
//       case HttpStatus.UNAUTHORIZED:
//         return 'Unauthorized';
//       case HttpStatus.FORBIDDEN:
//         return 'Forbidden';
//       case HttpStatus.NOT_FOUND:
//         return 'Resource not found';
//       case HttpStatus.TOO_MANY_REQUESTS:
//         return 'Too many requests';
//       case HttpStatus.INTERNAL_SERVER_ERROR:
//         return 'Unexpected server error';
//       default:
//         return 'Request failed';
//     }
//   }

//   private static getDefaultErrorCode(statusCode: number): string {
//     switch (statusCode) {
//       case HttpStatus.BAD_REQUEST:
//         return 'BAD_REQUEST';
//       case HttpStatus.UNAUTHORIZED:
//         return 'UNAUTHORIZED';
//       case HttpStatus.FORBIDDEN:
//         return 'FORBIDDEN';
//       case HttpStatus.NOT_FOUND:
//         return 'NOT_FOUND';
//       case HttpStatus.TOO_MANY_REQUESTS:
//         return 'TOO_MANY_REQUESTS';
//       case HttpStatus.INTERNAL_SERVER_ERROR:
//         return 'INTERNAL_SERVER_ERROR';
//       default:
//         return 'HTTP_EXCEPTION';
//     }
//   }
// }

// export class ApiResponseBuilder {
//   private static build<T>(
//     statusCode: number,
//     data: T | null,
//     error: ApiResponse<T>['error'],
//     meta?: unknown,
//   ): ApiResponse<T> {
//     return {
//       statusCode,
//       data,
//       error,
//       meta,
//       success: statusCode < 400,
//     };
//   }

//   static ok<T>(data: T, meta?: unknown) {
//     return this.build(HttpStatus.OK, data, null, meta);
//   }

//   static created<T>(data: T, meta?: unknown) {
//     return this.build(HttpStatus.CREATED, data, null, meta);
//   }

//   static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
//     return this.build(HttpStatus.BAD_REQUEST, null, {
//       code,
//       message,
//       details,
//     });
//   }

//   static notFound(message: string, code = 'NOT_FOUND') {
//     return this.build(HttpStatus.NOT_FOUND, null, {
//       code,
//       message,
//     });
//   }

//   static unAuthorized(message: string, code = 'UNAUTHORIZED') {
//     return this.build(HttpStatus.UNAUTHORIZED, null, {
//       code,
//       message,
//     });
//   }

//   static forbidden(message: string, code = 'FORBIDDEN') {
//     return this.build(HttpStatus.FORBIDDEN, null, {
//       code,
//       message,
//     });
//   }

//   static tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS') {
//     return this.build(HttpStatus.TOO_MANY_REQUESTS, null, {
//       code,
//       message,
//     });
//   }
// }
