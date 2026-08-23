# Monitoring agent (archived Nest leftovers)

> **Status:** Deferred / not wired into `AppModule`
>
> **Related:** ADR 0007, ADR 0008, ADR 0009

This folder holds **archived** Nest shapes for the deferred VPS
`monitoring-agent/` deployable (host/LiteSpeed telemetry batch ingest).

- Do **not** import `MonitoringAgentModule` (there is none yet).
- Do **not** register controllers here for Phase 1.
- Live agent plane is [`../agent/`](../agent/) at `/api/internal/agent/v1`.
- When monitoring work returns, resume under
  `/api/internal/monitoring-agent/v1` and a follow-up ADR that reactivates
  these DTOs/events.
