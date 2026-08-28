import { Global, Module } from '@nestjs/common';

import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitStore } from './rate-limit.store.js';

/**
 * Provides the shared fixed-window counter and the guard that reads
 * `@RateLimit(...)` metadata. Global so any module can attach the guard to a
 * route without re-importing, matching the idempotency/tenancy modules.
 */
@Global()
@Module({
  providers: [RateLimitStore, RateLimitGuard],
  exports: [RateLimitStore, RateLimitGuard],
})
export class RateLimitModule {}
