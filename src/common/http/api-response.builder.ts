import { HttpStatus } from '@nestjs/common';

import { ApiResponse } from './api-response.types.js';

export class ApiResponseBuilder {
  private static build<T>(
    statusCode: number,
    data: T | null,
    error: ApiResponse<T>['error'],
    meta?: unknown,
  ): ApiResponse<T> {
    return {
      statusCode,
      data,
      error,
      meta,
      success: statusCode < 400,
    };
  }

  static ok<T>(data: T, meta?: unknown) {
    return this.build(HttpStatus.OK, data, null, meta);
  }

  static created<T>(data: T, meta?: unknown) {
    return this.build(HttpStatus.CREATED, data, null, meta);
  }

  static badRequest(message: string, code = 'BAD_REQUEST', details?: unknown) {
    return this.build(HttpStatus.BAD_REQUEST, null, {
      code,
      message,
      details,
    });
  }

  static notFound(message: string, code = 'NOT_FOUND') {
    return this.build(HttpStatus.NOT_FOUND, null, {
      code,
      message,
    });
  }

  static unAuthorized(message: string, code = 'UNAUTHORIZED') {
    return this.build(HttpStatus.UNAUTHORIZED, null, {
      code,
      message,
    });
  }

  static forbidden(message: string, code = 'FORBIDDEN') {
    return this.build(HttpStatus.FORBIDDEN, null, {
      code,
      message,
    });
  }

  static tooManyRequests(message: string, code = 'TOO_MANY_REQUESTS') {
    return this.build(HttpStatus.TOO_MANY_REQUESTS, null, {
      code,
      message,
    });
  }
}
