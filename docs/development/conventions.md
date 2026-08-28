# Backend implementation conventions

> **Status:** Current
>
> **Scope:** `backend/` only
>
> **Last verified:** 2026-08-25

## Uptime and public probes

- Customer-facing uptime, response time, TTFB, and chart history come from the
  core backend uptime module, not the VPS monitor agent.
- VPS monitor agents own server/resource telemetry, LiteSpeed pressure, and
  website discovery only.
- Save public probe samples to `website_probe_metrics` with
  `probeSource = BACKEND`; dashboard REST history reads that source.
- Socket.io emits only the latest public probe tick after persistence. Do not
  build historical charts from Socket.io.
- Phase 1 keeps the uptime module in the core backend monolith. A later regional
  worker extraction must preserve the database/source contract.

## Scheduling and configuration

- Use NestJS scheduling through `@nestjs/schedule`.
- Use `SchedulerRegistry` and `CronJob` for dynamic cadence; do not run raw
  `setInterval`/`clearInterval` loops inside services.
- Add and validate environment variables in `src/utils/config/env.schema.ts`.
- Expose typed runtime values through `src/utils/config/app.config.ts`.
- Feature modules inject `ConfigService<AppConfigType, true>` and read
  `appConfig`; do not parse feature env variables directly in services.

## Probe diagnostics

- Public probes need separate DNS, connect, TLS, response/header, and total
  timeouts. Availability and TTFB require headers, not the full response body.
- Failed probes log safe diagnostic context including domain, phase,
  `statusCode`, response/TTFB timing, DNS/connect/TLS timing, resolved address
  family, and error message.
- If every external domain appears down, inspect those phase/timing fields
  before changing dashboard or agent code.
- Keep DNS timeout, IP-family preference, and probe debug flags in typed config.
  Enable `UPTIME_PROBE_DEBUG_LOGS=true` only during investigation because it
  also logs successful probes.

## OTP credentials

- Generate every OTP with `crypto.randomInt()` inside `OtpService`. `Math.random`
  is a predictable PRNG and must never produce a credential.
- Persist only a bcrypt digest in `otps.otp_hash`. The plaintext code exists in
  memory for the duration of the request that issues it and nowhere else — no
  column, no log, no cache.
- Verify by re-hashing the submitted code with the stored salt and comparing with
  `crypto.timingSafeEqual`. Never compare a submitted code to a stored code.
- Every rejection — unknown target, wrong code, expired, already consumed,
  attempts exhausted — returns the same `401 OTP_VERIFICATION_FAILED` with
  `"Verification failed."`. Callers learn nothing about which condition failed.
- Reserve every real verification attempt with one conditional database update
  before bcrypt. The update is constrained by challenge ID and hash,
  `consumed_at IS NULL`, unexpired state, and
  `attempt_count < OTP_MAX_VERIFY_ATTEMPTS`; its affected-row count is the
  concurrency-safe admission decision. A wrong code needs no later increment.
- Missing, terminal, or concurrency-exhausted challenges reserve against a nil
  ID and pay one decoy bcrypt operation before returning the generic rejection.
  Malformed bcrypt metadata also pays the decoy cost.
- A correct code is consumed with a conditional update guarded by challenge ID
  and hash plus `consumed_at IS NULL`, so concurrent replays cannot both
  succeed. A successful consume also resets `attempt_count`,
  `last_requested_time`, `request_count`, and
  `request_window_started_at`, allowing immediate fresh issuance while the
  consumed row continues to reject replays.
- Issuing a new code for a target resets `attempt_count` and `consumed_at`; a
  fresh challenge starts with a full attempt budget. Concurrent first issuance
  uniqueness conflicts are caller throttling and return `429 RATE_LIMITED`,
  never a server error.
- Successful request responses expose `retryAfterSeconds` from `OTP_RETRY_TIME`
  so frontends do not invent a client-only resend timer. Cooldown rejections
  expose the remaining seconds the same way.

## Abuse prevention

- Rate limiting uses the native `RateLimitGuard` in `src/common/rate-limit/`,
  applied per route with `@UseGuards(RateLimitGuard)` and `@RateLimit(...rules)`.
  There is no global throttler and no third-party throttling dependency; do not
  add a second mechanism.
- Declare limits as `{ configPath: 'app.otp.…' }` rather than literals so they
  stay env-tunable. Decorators evaluate before `ConfigService` exists, so the
  guard resolves the path at request time.
- Public OTP routes use `scope: 'ip'`. The deployed path has one trusted
  OpenLiteSpeed hop, configured with `TRUST_PROXY_HOPS=1`; direct deployments
  use `0`. Never use `trust proxy: true` or configure more hops than are
  actually present, because either choice lets clients forge the resolved
  address through `X-Forwarded-For`.
- Authenticated contact-verification and monitoring-access OTP routes use
  `scope: 'user'`, keyed by `request.user.sub` (or the canonical user ID).
  Missing identity on a user-scoped rule fails closed. Verify routes retain the
  independent per-target body rule.
- `scope: 'body'` keys on the first present `bodyFields` entry after trimming,
  converting Persian and Arabic phone digits to English, and lowercasing email
  addresses, then hashes the normalized value. Guards run before pipes, so this
  normalization must happen in the guard rather than relying on DTO transforms.
- Reuse the public and authenticated presets in
  `src/modules/auth/otp-rate-limits.ts` instead of redeclaring rules per
  controller.
- A rejected request answers `429 RATE_LIMITED` with `Retry-After` and never
  names the rule that tripped. Per-target OTP issuance cooldown rejections also
  put remaining wait in `error.details.retryAfterSeconds`; successful OTP
  request bodies include `data.retryAfterSeconds` (= `OTP_RETRY_TIME` × 60)
  so callers seed resend UIs from Nest.
- The process-local store is capped at 10,000 live buckets. It sweeps expired
  buckets at most once per fixed interval and evicts the oldest bucket in O(1)
  when still full. Durable per-target issuance and per-challenge attempt limits
  live on the `otps` row, so controls that must survive a restart or hold across
  replicas remain database-backed.

## Logging and request tracing

- Create class loggers with `createAppLogger(ContextName)` from
  `src/common/logging/app-logger.ts`; do not instantiate raw Nest `Logger` in
  feature code.
- Add loggers to I/O, auth, database, events, sockets, schedules, and important
  business decisions. Pure stateless helpers may remain unlogged.
- Every HTTP request passes through `requestContextMiddleware`, which preserves
  or creates `x-request-id` in `AsyncLocalStorage`.
- Auth flows/guards set `RequestContext.setUserId(userId)` after identity is
  known.
- Prefer stable event names such as `website.created` or `uptime.probe.down`
  and shallow serializable metadata.
- Never log secrets, JWTs, refresh tokens, HMAC signatures, passwords, OTPs,
  cookies, authorization headers, raw bodies, full telemetry batches, request
  or response objects, or sensitive Prisma models.
- Log batch summaries (`batchSize`, inserted counts, `durationMs`) instead of
  per-row metrics.
- Use `debug` for noisy flow, `log` for important success, `warn` for rejected
  recoverable cases, `error` for failed operations, and `fatal` for startup or
  configuration failure.
- Logger levels follow `APP_ENV`, then `NODE_ENV`: development enables debug
  and verbose; staging enables debug; production enables log/warn/error/fatal;
  test enables error/fatal.
- Staging uses `APP_ENV=staging` with `NODE_ENV=production`; development and
  production set both variables to their matching environment.
- Database operations log important completed writes/batches and failures, not
  before/after every row.
- Guards log safe rejection reasons without credentials or signatures. Socket
  connection/auth results may be logged; live ticks stay debug or unlogged.
- Pass errors through `logger.error(event, error, fields)` rather than putting a
  full `Error` object in metadata.
