import type { RateLimitRule } from '#/common/rate-limit/rate-limit.decorator.js';

/**
 * Rate limit rules shared by every OTP endpoint, in `auth` and in the user
 * contact-verification routes.
 *
 * These cover abuse vectors the database cannot: one public address or
 * authenticated user hammering many targets, and verification traffic aimed at
 * a target that has no outstanding challenge to count attempts against. The
 * per-target issue ceiling and per-challenge attempt ceiling are enforced
 * durably on the OTP row, so they survive restarts and are not duplicated here.
 */

/** Applied to endpoints that issue a code. */
export const OTP_REQUEST_RATE_LIMITS: readonly RateLimitRule[] = [
  {
    name: 'otp.request',
    scope: 'ip',
    limit: { configPath: 'app.otp.ipRequestLimit' },
    windowSeconds: { configPath: 'app.otp.ipRequestWindowSeconds' },
  },
];

/** Applied to endpoints that verify a submitted code. */
export const OTP_VERIFY_RATE_LIMITS: readonly RateLimitRule[] = [
  {
    name: 'otp.verify',
    scope: 'ip',
    limit: { configPath: 'app.otp.ipVerifyLimit' },
    windowSeconds: { configPath: 'app.otp.ipVerifyWindowSeconds' },
  },
  {
    name: 'otp.verify.target',
    scope: 'body',
    bodyFields: ['phoneNumber', 'email'],
    limit: { configPath: 'app.otp.targetVerifyLimit' },
    windowSeconds: { configPath: 'app.otp.targetVerifyWindowSeconds' },
  },
];

/** Applied to authenticated endpoints that issue a code. */
export const AUTHENTICATED_OTP_REQUEST_RATE_LIMITS: readonly RateLimitRule[] = [
  {
    name: 'otp.request',
    scope: 'user',
    limit: { configPath: 'app.otp.ipRequestLimit' },
    windowSeconds: { configPath: 'app.otp.ipRequestWindowSeconds' },
  },
];

/** Applied to authenticated endpoints that verify a submitted code. */
export const AUTHENTICATED_OTP_VERIFY_RATE_LIMITS: readonly RateLimitRule[] = [
  {
    name: 'otp.verify',
    scope: 'user',
    limit: { configPath: 'app.otp.ipVerifyLimit' },
    windowSeconds: { configPath: 'app.otp.ipVerifyWindowSeconds' },
  },
  {
    name: 'otp.verify.target',
    scope: 'body',
    bodyFields: ['phoneNumber', 'email'],
    limit: { configPath: 'app.otp.targetVerifyLimit' },
    windowSeconds: { configPath: 'app.otp.targetVerifyWindowSeconds' },
  },
];
