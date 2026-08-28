import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * True for a rejection the caller caused (a 4xx), such as hitting a rate limit
 * or submitting an invalid code.
 *
 * Services that wrap work in `try/catch` for logging should use this to decide
 * the level: client failures are already logged as warnings where they are
 * raised, so re-logging them via `logger.error` writes a stack trace for what is
 * ordinary, expected traffic. Worse, on a rate-limited endpoint it hands an
 * attacker an error-log amplifier — every blocked request costs a stack trace,
 * which is exactly the cost rate limiting exists to remove.
 *
 * This mirrors `GlobalExceptionFilter`, which only reports 5xx responses through
 * `logger.error`.
 */
export function isClientFailure(error: unknown): boolean {
  return (
    error instanceof HttpException &&
    error.getStatus() < HttpStatus.INTERNAL_SERVER_ERROR
  );
}
