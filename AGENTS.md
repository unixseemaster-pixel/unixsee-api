# Unixsee API Agent Instructions

## Uptime and public probe architecture

- Customer-facing uptime, response time, TTFB, and uptime chart data must come from the core backend uptime module, not from the VPS monitor agent.
- VPS monitor agents are responsible for server/resource telemetry, LiteSpeed/request-pressure metrics, and website discovery only.
- Do not re-introduce agent-provided website probe persistence as the source of truth for customer dashboard uptime.
- The uptime module must save public probe samples to `website_probe_metrics` with `probeSource = BACKEND`.
- Dashboard REST chart endpoints should read public probe samples using `probeSource = BACKEND`.
- Socket.io should emit only the latest public probe status/tick after the backend uptime module saves a probe result. Do not build historical charts from Socket.io.

## Scheduling rules

- Use NestJS scheduling primitives through `@nestjs/schedule` for scheduled uptime work.
- Do not implement uptime scheduler loops with raw `setInterval` / `clearInterval` inside services.
- Dynamic scheduling should use `SchedulerRegistry` and `CronJob` so cadence stays configurable and owned by Nest's scheduler lifecycle.
- Uptime scheduler configuration must be read through typed application config, not direct `process.env` reads inside feature modules.

## Configuration rules

- Add and validate environment variables in `src/utils/config/env.schema.ts`.
- Expose typed runtime configuration through `src/utils/config/app.config.ts`.
- Feature modules should inject `ConfigService<AppConfigType, true>` and read from `appConfig`.
- Do not parse uptime module env variables directly inside uptime services.

## Production split

- Phase one production keeps the uptime module inside the core backend monolith.
- Later, this module can be extracted into regional external probe workers, but the database/source contract should stay compatible.

## Uptime probe diagnostics

- Failed public uptime probes must log enough context to diagnose DNS, connect, TLS, timeout, HTTP status, and response phases.
- Do not wait for the full HTML/body to determine uptime; response headers are enough for public availability and response-time/TTFB metrics.
- Keep DNS timeout, IP family preference, and debug logging in typed config under `src/utils/config/env.schema.ts` and `src/utils/config/app.config.ts`.
- Use `UPTIME_PROBE_DEBUG_LOGS=true` only for investigation because it logs successful probe details too.
- If every external domain is marked down, first inspect the logged `phase`, `dnsMs`, `resolved`, `family`, `connectMs`, `tlsMs`, and `error` fields before changing dashboard or agent code.

## Logging and request tracing rules

- Use the built-in NestJS logger only through `createAppLogger(ContextName)` from `src/common/logging/app-logger.ts`.
- Do not create raw `new Logger(...)` instances in feature code. The wrapper automatically adds the current `requestId` and masks common sensitive fields.
- Class context means the source class/module name attached to every log line. Use `private readonly logger = createAppLogger(MyService.name);` in services, controllers, guards, gateways, listeners, and scheduled workers.
- Add the logger to classes that perform I/O, auth, DB writes/reads, event dispatching, socket work, scheduled jobs, or important business decisions. Pure stateless calculation helpers may stay unlogged unless they make a decision that must be audited.
- Every HTTP request must pass through `requestContextMiddleware`, which creates or preserves the `x-request-id` header and stores it in `AsyncLocalStorage` for downstream logs.
- When a user is authenticated, set the request user context with `RequestContext.setUserId(userId)` in guards or auth flows so later logs can be correlated.
- Prefer stable event names instead of prose messages, for example `agent.ingest.stored`, `auth.login.completed`, `socket.connected`, or `uptime.probe.down`.
- Pass structured metadata as the second argument: `this.logger.log('website.created', { websiteId, domain, userId })`.
- Never log secrets, JWTs, refresh tokens, HMAC signatures, passwords, OTP codes, cookies, authorization headers, raw request bodies, or full telemetry batches.
- Log batch summaries instead of per-row metric records. Include counts and duration: `batchSize`, `vpsInserted`, `webInserted`, `durationMs`.
- Use `debug` for noisy flow details, `log` for important successful business events, `warn` for rejected or suspicious recoverable cases, `error` for failed operations, and `fatal` for startup/config failures.
- Logger levels must be driven by `APP_ENV` first, then `NODE_ENV` as fallback. Environment policy: development enables `debug` and `verbose`; staging enables `debug` but not `verbose`; production enables only `log`, `warn`, `error`, and `fatal`; test enables only `error` and `fatal`.
- In staging set `APP_ENV=staging` and `NODE_ENV=production`. In development set both to `development`. In production set both to `production`.
- In production, keep `debug` and `verbose` disabled unless investigating an incident. Do not add high-volume success logs to hot paths.
- For database writes, do not log before and after every row. Log after important create/update/delete operations or after a batch completes. Always log failed DB operations with error context.
- For guards, log the rejection reason safely, such as missing header, timestamp drift, unknown machine, or invalid signature. Do not log the actual secret or signature.
- For Socket.io, log connection/session results and authorization failures. Keep live tick broadcasts at `debug` or unlogged unless debugging.
- For uptime probes, failed probes must include diagnostic fields such as domain, phase, statusCode, responseTimeMs, ttfbMs, dnsMs, connectMs, tlsHandshakeMs, and errorMessage. Successful probe details should stay behind debug logging.
- Keep log fields shallow and serializable. Do not pass large nested objects, Prisma models with sensitive fields, request objects, response objects, or full Error objects as metadata. Pass the Error object only to `logger.error(event, error, fields)`.
