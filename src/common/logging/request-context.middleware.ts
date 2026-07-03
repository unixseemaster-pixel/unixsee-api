import { randomUUID } from 'node:crypto';

import type { NextFunction, Request, Response } from 'express';

import { createAppLogger } from './app-logger.js';
import { RequestContext } from './request-context.js';

const REQUEST_ID_HEADER = 'x-request-id';
const SLOW_REQUEST_MS = 1_000;
const httpLogger = createAppLogger('HttpRequest');

export function requestContextMiddleware(
  request: Request,
  response: Response,
  next: NextFunction,
): void {
  const startedAt = Date.now();
  const requestId = resolveRequestId(request.headers[REQUEST_ID_HEADER]);

  request.requestId = requestId;
  response.setHeader(REQUEST_ID_HEADER, requestId);

  RequestContext.run(
    {
      requestId,
      method: request.method,
      path: request.originalUrl ?? request.url,
    },
    () => {
      response.on('finish', () => {
        logCompletedRequest(request, response, Date.now() - startedAt);
      });

      next();
    },
  );
}

function resolveRequestId(headerValue: unknown): string {
  const incoming = Array.isArray(headerValue) ? headerValue[0] : headerValue;

  if (typeof incoming === 'string' && incoming.trim().length > 0) {
    return incoming.trim().slice(0, 128);
  }

  return randomUUID();
}

function logCompletedRequest(
  request: Request,
  response: Response,
  durationMs: number,
): void {
  const path = request.originalUrl ?? request.url;

  if (path === '/api/health' || path === '/health') {
    return;
  }

  const fields = {
    method: request.method,
    path,
    statusCode: response.statusCode,
    durationMs,
    ip: request.ip,
  };

  if (response.statusCode >= 500) {
    httpLogger.warn('http.request.completed', fields);
    return;
  }

  if (response.statusCode >= 400) {
    httpLogger.warn('http.request.rejected', fields);
    return;
  }

  if (durationMs >= SLOW_REQUEST_MS) {
    httpLogger.log('http.request.slow', fields);
    return;
  }

  httpLogger.debug('http.request.completed', fields);
}
