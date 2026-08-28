import { describe, expect, it } from 'vitest';

import { RATE_LIMIT_METADATA_KEY } from '#/common/rate-limit/rate-limit.decorator.js';
import type { RateLimitRule } from '#/common/rate-limit/rate-limit.decorator.js';
import { UsersController } from '#/modules/users/controllers/users.controller.js';

import { AuthenticationController } from './controllers/authentication.controller.js';

const rulesFor = (
  controller: object,
  method: string,
): readonly RateLimitRule[] => {
  const handler = Object.getOwnPropertyDescriptor(controller, method)?.value as
    | ((...args: unknown[]) => unknown)
    | undefined;

  if (!handler) throw new Error(`Missing controller method: ${method}`);

  return Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, handler) as
    | readonly RateLimitRule[]
    | [];
};

describe('OTP route rate-limit presets', () => {
  it('uses user subjects on all six authenticated OTP routes', () => {
    const authenticatedRoutes: Array<[object, string]> = [
      [AuthenticationController.prototype, 'sendMonitoringAccessOtp'],
      [AuthenticationController.prototype, 'validateMonitoringAccessOtp'],
      [UsersController.prototype, 'requestPhoneVerifyOtp'],
      [UsersController.prototype, 'verifyPhoneOtp'],
      [UsersController.prototype, 'requestEmailVerifyOtp'],
      [UsersController.prototype, 'verifyEmailOtp'],
    ];

    for (const [controller, method] of authenticatedRoutes) {
      expect(rulesFor(controller, method)[0]?.scope).toBe('user');
    }
  });

  it('keeps public OTP routes scoped by IP', () => {
    expect(
      rulesFor(AuthenticationController.prototype, 'sendOtp')[0]?.scope,
    ).toBe('ip');
    expect(
      rulesFor(AuthenticationController.prototype, 'validateOtp')[0]?.scope,
    ).toBe('ip');
  });

  it('retains target-wide protection on authenticated verify routes', () => {
    const verifyRoutes: Array<[object, string]> = [
      [AuthenticationController.prototype, 'validateMonitoringAccessOtp'],
      [UsersController.prototype, 'verifyPhoneOtp'],
      [UsersController.prototype, 'verifyEmailOtp'],
    ];

    for (const [controller, method] of verifyRoutes) {
      expect(rulesFor(controller, method)[1]).toMatchObject({
        name: 'otp.verify.target',
        scope: 'body',
      });
    }
  });
});
