# Backend documentation

App-local implementation conventions, operational notes, and historical design
material for the standalone Unixsee NestJS deployable. Start here after
[`../AGENTS.md`](../AGENTS.md).

## Current app-local routes

| When changing…                                                       | Read                                                                 |
| -------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Logging, request tracing, typed config, scheduling, or uptime probes | [`development/conventions.md`](development/conventions.md)           |
| Realtime monitoring integration                                      | [`frontend/realtime-monitoring.md`](frontend/realtime-monitoring.md) |
| OpenLiteSpeed/server operations                                      | [`server/`](server/)                                                 |
| Staging host operations                                              | [`staging/`](staging/)                                               |

## Historical and secondary material

Several documents in this folder predate the current monorepo architecture.
They may explain prior thinking but are not accepted contracts. In particular,
[`modules-apis.md`](modules-apis.md) describes an older mega-admin target that
ADR 0005 rejects. Keep historical notes out of high-frequency implementation
routes.

Accepted contracts outrank local historical documents.

## Monorepo-only contract routes

Ordinary backend implementation conventions are local. When a task changes a
route, DTO, product behavior, auth boundary, or agent protocol, work in the
monorepo and load:

- Backend ownership: [`../../docs/backend/README.md`](../../docs/backend/README.md)
- Route/module map: [`../../docs/backend/modules-and-routes.md`](../../docs/backend/modules-and-routes.md)
- Wire contracts: [`../../docs/backend/contracts/`](../../docs/backend/contracts/)
- Audience/module ADRs: [`0004`](../../docs/architecture/decisions/0004-api-audience-namespaces.md)
  and [`0005`](../../docs/architecture/decisions/0005-domain-modules-multi-audience-controllers.md)
- Agent contracts: [`../../docs/agent/README.md`](../../docs/agent/README.md)
- Shared product behavior: [`../../docs/product/`](../../docs/product/)

Do not invent a shared contract when those sources are unavailable.
