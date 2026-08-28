import { Injectable } from '@nestjs/common';

export interface RateLimitHitResult {
  allowed: boolean;
  /** Requests recorded in the current window, including this one. */
  current: number;
  limit: number;
  /** Whole seconds until the current window resets. */
  retryAfterSeconds: number;
}

interface WindowState {
  count: number;
  /** Epoch milliseconds at which the window resets. */
  resetAt: number;
}

/** Hard memory bound for process-local rate-limit buckets. */
const MAX_BUCKETS = 10_000;
/** Full expiry sweeps are amortized instead of running for every attacker key. */
const PRUNE_INTERVAL_MS = 30_000;

/**
 * In-memory fixed-window counter backing {@link RateLimitGuard}.
 *
 * Process-local by design: it needs no infrastructure and cannot fail open on a
 * cache outage. Durable, per-target limits live in the database next to the OTP
 * challenge, so a restart or a second instance cannot reset them. Swap this for
 * a shared store when the API runs behind more than one node and the per-IP
 * ceiling has to be exact.
 */
@Injectable()
export class RateLimitStore {
  private readonly windows = new Map<string, WindowState>();
  private nextPruneAt = 0;

  /** Records one request against `key` and reports whether it is allowed. */
  hit(key: string, limit: number, windowSeconds: number): RateLimitHitResult {
    const now = Date.now();
    const existing = this.windows.get(key);

    if (!existing || existing.resetAt <= now) {
      // Delete expired entries before re-inserting so Map insertion order keeps
      // the oldest live bucket at the front for constant-time pressure eviction.
      if (existing) this.windows.delete(key);

      this.prepareForInsert(now);
      this.windows.set(key, {
        count: 1,
        resetAt: now + windowSeconds * 1000,
      });

      return {
        allowed: true,
        current: 1,
        limit,
        retryAfterSeconds: windowSeconds,
      };
    }

    existing.count += 1;

    return {
      allowed: existing.count <= limit,
      current: existing.count,
      limit,
      retryAfterSeconds: Math.max(
        1,
        Math.ceil((existing.resetAt - now) / 1000),
      ),
    };
  }

  /** Drops all counters. Intended for tests. */
  reset(): void {
    this.windows.clear();
    this.nextPruneAt = 0;
  }

  private prepareForInsert(now: number): void {
    if (now >= this.nextPruneAt) {
      this.pruneExpired(now);
      this.nextPruneAt = now + PRUNE_INTERVAL_MS;
    }

    if (this.windows.size < MAX_BUCKETS) return;

    // The map is insertion ordered. Evicting one oldest bucket keeps memory
    // bounded and avoids an O(n) scan for every attacker-varied subject.
    const oldestKey = this.windows.keys().next().value as string | undefined;
    if (oldestKey !== undefined) this.windows.delete(oldestKey);
  }

  private pruneExpired(now: number): void {
    for (const [key, state] of this.windows) {
      if (state.resetAt <= now) this.windows.delete(key);
    }
  }
}
