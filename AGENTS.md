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
