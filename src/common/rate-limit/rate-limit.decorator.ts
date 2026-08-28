import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_METADATA_KEY = 'rateLimit';

/**
 * How a request is attributed to a counter bucket.
 *
 * - `ip`: client address, so one public caller cannot spread abuse across targets.
 * - `user`: authenticated user id, so customers behind shared carrier NAT do
 *   not consume one another's allowance.
 * - `body`: a field of the request body (for example the phone number), so one
 *   target cannot be attacked from many addresses.
 */
export type RateLimitScope = 'ip' | 'user' | 'body';

/**
 * A limit or window, either inline or read from configuration at request time.
 *
 * Decorators are evaluated when the class is defined, long before
 * `ConfigService` exists, so an env-driven limit has to be declared as the
 * config path to resolve rather than as a value.
 */
export type RateLimitValue = number | { configPath: string };

export interface RateLimitRule {
  /** Stable name for the bucket; keeps unrelated routes from sharing counters. */
  name: string;
  /** Requests allowed per window. */
  limit: RateLimitValue;
  /** Window length in seconds. */
  windowSeconds: RateLimitValue;
  scope: RateLimitScope;
  /** Body fields to attribute by, first present one wins. Only for `body`. */
  bodyFields?: readonly string[];
}

/**
 * Applies fixed-window rate limiting to a route. Multiple rules stack, so a
 * route can be limited per IP and per target at the same time.
 *
 * Requires {@link RateLimitGuard} on the route, controller, or app.
 */
export const RateLimit = (...rules: RateLimitRule[]) =>
  SetMetadata(RATE_LIMIT_METADATA_KEY, rules);
