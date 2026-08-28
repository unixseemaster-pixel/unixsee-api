import { HttpException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { Test, type TestingModule } from '@nestjs/testing';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { ExecutionContext } from '@nestjs/common';

import { RateLimitGuard } from './rate-limit.guard.js';
import { RateLimitStore } from './rate-limit.store.js';
import {
  RATE_LIMIT_METADATA_KEY,
  RateLimit,
  type RateLimitRule,
} from './rate-limit.decorator.js';

const IP_LIMIT = 3;
const TARGET_LIMIT = 2;

const IP_RULE: RateLimitRule = {
  name: 'test.ip',
  scope: 'ip',
  limit: IP_LIMIT,
  windowSeconds: 60,
};

const BODY_RULE: RateLimitRule = {
  name: 'test.target',
  scope: 'body',
  bodyFields: ['phoneNumber', 'email'],
  limit: TARGET_LIMIT,
  windowSeconds: 60,
};

const USER_RULE: RateLimitRule = {
  name: 'test.user',
  scope: 'user',
  limit: TARGET_LIMIT,
  windowSeconds: 60,
};

describe('RateLimitStore', () => {
  let store: RateLimitStore;

  beforeEach(() => {
    store = new RateLimitStore();
  });

  it('allows requests up to the limit and blocks the next one', () => {
    expect(store.hit('a', 2, 60).allowed).toBe(true);
    expect(store.hit('a', 2, 60).allowed).toBe(true);

    const blocked = store.hit('a', 2, 60);

    expect(blocked.allowed).toBe(false);
    expect(blocked.current).toBe(3);
    expect(blocked.retryAfterSeconds).toBeGreaterThan(0);
  });

  it('counts each key independently', () => {
    store.hit('a', 1, 60);

    expect(store.hit('a', 1, 60).allowed).toBe(false);
    expect(store.hit('b', 1, 60).allowed).toBe(true);
  });

  it('starts a new window once the previous one expires', () => {
    vi.useFakeTimers();

    try {
      store.hit('a', 1, 60);
      expect(store.hit('a', 1, 60).allowed).toBe(false);

      vi.advanceTimersByTime(61_000);

      expect(store.hit('a', 1, 60).allowed).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps memory bounded when subjects vary faster than windows expire', () => {
    for (let index = 0; index < 10_005; index++) {
      store.hit(`attacker-${index}`, 1, 3_600);
    }

    const windows = (store as unknown as { windows: Map<string, unknown> })
      .windows;

    expect(windows.size).toBe(10_000);
    expect(windows.has('attacker-0')).toBe(false);
    expect(windows.has('attacker-10004')).toBe(true);
  });
});

describe('RateLimitGuard', () => {
  let guard: RateLimitGuard;
  let rules: RateLimitRule[];
  let setHeader: ReturnType<typeof vi.fn>;

  const contextFor = (request: Record<string, unknown>): ExecutionContext =>
    ({
      getType: () => 'http',
      getHandler: () => () => undefined,
      getClass: () => class {},
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ setHeader }),
      }),
    }) as unknown as ExecutionContext;

  beforeEach(async () => {
    rules = [];
    setHeader = vi.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimitGuard,
        RateLimitStore,
        {
          provide: Reflector,
          useValue: { getAllAndOverride: vi.fn(() => rules) },
        },
        {
          provide: ConfigService,
          useValue: {
            get: vi.fn((path: string) =>
              path === 'app.otp.ipVerifyLimit' ? 2 : undefined,
            ),
          },
        },
      ],
    }).compile();

    guard = module.get(RateLimitGuard);
  });

  it('allows any traffic on a route with no rules', () => {
    expect(guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toBe(true);
    expect(guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toBe(true);
  });

  it('blocks repeated requests from the same address once the limit is passed', () => {
    rules = [IP_RULE];
    const request = {
      ip: '1.1.1.1',
      method: 'POST',
      url: '/v1/auth/otp/request',
    };

    for (let i = 0; i < IP_LIMIT; i++) {
      expect(guard.canActivate(contextFor(request))).toBe(true);
    }

    expect(() => guard.canActivate(contextFor(request))).toThrowError(
      HttpException,
    );
  });

  it('answers a blocked request with 429, a stable code, and Retry-After', () => {
    rules = [IP_RULE];
    const request = {
      ip: '1.1.1.1',
      method: 'POST',
      url: '/v1/auth/otp/verify',
    };

    for (let i = 0; i < IP_LIMIT; i++) guard.canActivate(contextFor(request));

    let rejection: unknown;
    try {
      guard.canActivate(contextFor(request));
    } catch (error) {
      rejection = error;
    }

    expect(rejection).toBeInstanceOf(HttpException);

    const blocked = rejection as HttpException;
    expect(blocked.getStatus()).toBe(429);
    expect(blocked.getResponse()).toEqual({
      code: 'RATE_LIMITED',
      message: 'Too many requests. Please try again later.',
    });
    expect(setHeader).toHaveBeenCalledWith('Retry-After', expect.any(String));
  });

  it('counts addresses separately, so one caller cannot block another', () => {
    rules = [IP_RULE];

    for (let i = 0; i < IP_LIMIT; i++) {
      guard.canActivate(contextFor({ ip: '1.1.1.1' }));
    }

    expect(() => guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toThrowError(
      HttpException,
    );
    expect(guard.canActivate(contextFor({ ip: '2.2.2.2' }))).toBe(true);
  });

  it("shares a user-scoped budget across that user's addresses", () => {
    rules = [USER_RULE];

    expect(
      guard.canActivate(contextFor({ ip: '1.1.1.1', user: { sub: 'user-1' } })),
    ).toBe(true);
    expect(
      guard.canActivate(contextFor({ ip: '2.2.2.2', user: { sub: 'user-1' } })),
    ).toBe(true);

    expect(() =>
      guard.canActivate(contextFor({ ip: '3.3.3.3', user: { sub: 'user-1' } })),
    ).toThrowError(HttpException);
  });

  it('does not make users behind one address share a user-scoped budget', () => {
    rules = [USER_RULE];

    for (let index = 0; index < TARGET_LIMIT; index++) {
      expect(
        guard.canActivate(
          contextFor({ ip: '1.1.1.1', user: { sub: 'user-1' } }),
        ),
      ).toBe(true);
    }

    expect(
      guard.canActivate(contextFor({ ip: '1.1.1.1', user: { sub: 'user-2' } })),
    ).toBe(true);
  });

  it('fails closed when a user-scoped rule has no authenticated user', () => {
    rules = [USER_RULE];

    expect(() => guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toThrowError(
      HttpException,
    );
  });

  it('blocks repeated verification attempts aimed at one target across addresses', () => {
    rules = [BODY_RULE];

    expect(
      guard.canActivate(
        contextFor({ ip: '1.1.1.1', body: { phoneNumber: '+989120000000' } }),
      ),
    ).toBe(true);
    expect(
      guard.canActivate(
        contextFor({ ip: '2.2.2.2', body: { phoneNumber: '+989120000000' } }),
      ),
    ).toBe(true);

    expect(() =>
      guard.canActivate(
        contextFor({ ip: '3.3.3.3', body: { phoneNumber: '+989120000000' } }),
      ),
    ).toThrowError(HttpException);

    // A different target is unaffected.
    expect(
      guard.canActivate(
        contextFor({ ip: '3.3.3.3', body: { phoneNumber: '+989121111111' } }),
      ),
    ).toBe(true);
  });

  it('treats a target as the same regardless of case or padding', () => {
    rules = [BODY_RULE];

    guard.canActivate(
      contextFor({ ip: '1.1.1.1', body: { email: 'A@B.com' } }),
    );
    guard.canActivate(
      contextFor({ ip: '1.1.1.1', body: { email: ' a@b.com ' } }),
    );

    expect(() =>
      guard.canActivate(
        contextFor({ ip: '1.1.1.1', body: { email: 'a@b.com' } }),
      ),
    ).toThrowError(HttpException);
  });

  it('uses one target bucket for Persian, Arabic, and English phone digits', () => {
    rules = [BODY_RULE];

    guard.canActivate(contextFor({ body: { phoneNumber: '+۹۸۹۱۲۰۰۰۰۰۰۰' } }));
    guard.canActivate(contextFor({ body: { phoneNumber: '+989120000000' } }));

    expect(() =>
      guard.canActivate(contextFor({ body: { phoneNumber: '+٩٨٩١٢٠٠٠٠٠٠٠' } })),
    ).toThrowError(HttpException);
  });

  it('skips a rule whose subject is absent instead of failing closed', () => {
    rules = [BODY_RULE];

    for (let i = 0; i < 5; i++) {
      expect(guard.canActivate(contextFor({ ip: '1.1.1.1', body: {} }))).toBe(
        true,
      );
    }
  });

  it('evaluates every rule, so an address limit still applies to a fresh target', () => {
    rules = [IP_RULE, BODY_RULE];
    const request = (phoneNumber: string) => ({
      ip: '1.1.1.1',
      body: { phoneNumber },
    });

    expect(guard.canActivate(contextFor(request('+98912000001')))).toBe(true);
    expect(guard.canActivate(contextFor(request('+98912000002')))).toBe(true);
    expect(guard.canActivate(contextFor(request('+98912000003')))).toBe(true);

    // Under the per-target limit, but the address has used its whole budget.
    expect(() =>
      guard.canActivate(contextFor(request('+98912000004'))),
    ).toThrowError(HttpException);
  });

  it('resolves limits declared as config paths', () => {
    rules = [
      {
        name: 'test.configured',
        scope: 'ip',
        limit: { configPath: 'app.otp.ipVerifyLimit' },
        windowSeconds: 60,
      },
    ];
    const request = { ip: '1.1.1.1' };

    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(guard.canActivate(contextFor(request))).toBe(true);
    expect(() => guard.canActivate(contextFor(request))).toThrowError(
      HttpException,
    );
  });

  it('fails loudly when a configured limit is missing rather than skipping the rule', () => {
    rules = [
      {
        name: 'test.missing',
        scope: 'ip',
        limit: { configPath: 'app.otp.doesNotExist' },
        windowSeconds: 60,
      },
    ];

    expect(() => guard.canActivate(contextFor({ ip: '1.1.1.1' }))).toThrowError(
      /doesNotExist/,
    );
  });

  it('falls back to the socket address when the request has no resolved ip', () => {
    rules = [IP_RULE];
    const request = { socket: { remoteAddress: '9.9.9.9' } };

    for (let i = 0; i < IP_LIMIT; i++) {
      expect(guard.canActivate(contextFor(request))).toBe(true);
    }

    expect(() => guard.canActivate(contextFor(request))).toThrowError(
      HttpException,
    );
  });

  it('does not hold raw addresses or contact details in its key index', () => {
    rules = [IP_RULE, BODY_RULE];

    guard.canActivate(
      contextFor({ ip: '1.1.1.1', body: { phoneNumber: '+989120000000' } }),
    );

    const keys = JSON.stringify([
      ...(
        guard as unknown as { store: { windows: Map<string, unknown> } }
      ).store.windows.keys(),
    ]);

    expect(keys).not.toContain('1.1.1.1');
    expect(keys).not.toContain('+989120000000');
  });

  it('ignores non-http execution contexts', () => {
    rules = [IP_RULE];

    const wsContext = {
      getType: () => 'ws',
    } as unknown as ExecutionContext;

    expect(guard.canActivate(wsContext)).toBe(true);
  });
});

describe('RateLimit decorator', () => {
  it('records its rules as route metadata under the key the guard reads', () => {
    class Controller {
      handler() {}
    }

    const rules: RateLimitRule[] = [IP_RULE, BODY_RULE];
    const descriptor = Object.getOwnPropertyDescriptor(
      Controller.prototype,
      'handler',
    )!;

    RateLimit(...rules)(Controller.prototype, 'handler', descriptor);

    expect(
      Reflect.getMetadata(RATE_LIMIT_METADATA_KEY, descriptor.value),
    ).toEqual(rules);
  });
});
