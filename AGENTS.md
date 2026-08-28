# Unixsee backend agent guide

This folder is the standalone NestJS control-plane deployable. Start with the
local docs index for implementation conventions; use monorepo docs for shared
API, product, agent, or architecture contracts.

## Read first

| Task                                       | Read                                                                                    |
| ------------------------------------------ | --------------------------------------------------------------------------------------- |
| Any backend implementation                 | [`docs/README.md`](docs/README.md)                                                      |
| Logging, config, scheduling, uptime probes | [`docs/development/conventions.md`](docs/development/conventions.md)                    |
| Deployment/host operation                  | Relevant entry under [`docs/server/`](docs/server/) or [`docs/staging/`](docs/staging/) |
| Realtime monitoring                        | [`docs/frontend/realtime-monitoring.md`](docs/frontend/realtime-monitoring.md)          |

## High-frequency backend rules

- Use `createAppLogger(ContextName)`; do not create raw Nest `Logger`
  instances in feature code. Never log secrets or full sensitive payloads.
- Add/validate environment variables in `src/utils/config/env.schema.ts` and
  expose them through typed `app.config.ts`; feature services must not parse
  `process.env` directly.
- Use `@nestjs/schedule`, `SchedulerRegistry`, and `CronJob` for scheduled
  work—not raw `setInterval` loops in services.
- Public website uptime/TTFB comes from the backend uptime module and
  `website_probe_metrics` with `probeSource = BACKEND`, not VPS monitor agents.

The local conventions document is canonical for detail and diagnostics.

## Control-plane boundaries

- NestJS owns auth, persistence, business rules, orchestration, agent
  validation, and the APIs consumed by admin/client.
- Keep the current JWT/OTP design; extend role/capability checks rather than
  redesigning authentication.
- Keep domain modules with audience-specific controllers. Do not recreate a
  mega admin module.
- Validate agent credentials/payloads. Agents connect outbound to NestJS; UIs
  never connect to agents or VPS hosts.
- Do not invent unavailable scripts, routes, DTOs, schema, or shipped status.

## Monorepo contracts

When this checkout is inside the monorepo and a task changes a shared contract,
also read:

- Route/module map: [`../docs/backend/modules-and-routes.md`](../docs/backend/modules-and-routes.md)
- API contracts: [`../docs/backend/contracts/`](../docs/backend/contracts/)
- Audience/module ADRs: [`0004`](../docs/architecture/decisions/0004-api-audience-namespaces.md)
  and [`0005`](../docs/architecture/decisions/0005-domain-modules-multi-audience-controllers.md)
- Agent integration: [`../docs/agent/README.md`](../docs/agent/README.md)
- Product behavior: [`../docs/product/phase-1-application-features.md`](../docs/product/phase-1-application-features.md)

Do not use historical local design notes as a substitute for accepted shared
contracts. Make cross-app contract changes in the monorepo.

## Working and validation rules

- Inspect the owning module, configuration, schema, tests, and current route
  before changing behavior.
- Keep changes focused and preserve unrelated work.
- Add or update contracts alongside Nest changes that alter wire behavior.
- Use only scripts present in `backend/package.json` and report only checks that
  actually ran.
- Format every touched Prettier-supported file, then run Prettier `--check` on
  the same explicit list.
