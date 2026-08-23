> **Historical / secondary:** Prefer monorepo
> [`docs/backend/modules-and-routes.md`](../../docs/backend/modules-and-routes.md)
> and ADRs 0004–0005 for new Nest work. This file still describes an older
> target shape (including a mega `admin` module) that **ADR 0005 rejects**.
> Keep useful endpoint ideas; do not follow conflicting structure.

For this architecture, your backend should be designed around:

- Clear bounded contexts (modules)
- Separation of operational vs customer-facing APIs
- Read-optimized APIs for dashboards
- Event-driven internal communication
- Future horizontal scalability
- Strict tenant isolation

A strong approach is:

# High-Level Module Architecture

```txt
src/modules
├── auth
├── users
├── servers
├── vps-nodes
├── websites
├── metrics
│   ├── vps-metrics
│   ├── web-metrics
│   └── analytics
├── realtime
├── alerts
├── ssl-certificates
├── tenants
├── admin
├── health
└── agent-ingestion
```

---

# 1. Auth Module

Responsible only for authentication/session lifecycle.

## Responsibilities

- Login
- Refresh token
- Logout
- Access token issuing
- HMAC agent auth validation helper

## Endpoints

```txt
POST   /auth/login
POST   /auth/refresh
POST   /auth/logout
GET    /auth/me
```

---

# 2. Users Module

Human users management.

## Responsibilities

- User CRUD
- Role assignment
- Profile management

## Endpoints

### Admin

```txt
GET    /admin/users
GET    /admin/users/:id
POST   /admin/users
PATCH  /admin/users/:id
DELETE /admin/users/:id
```

### User

```txt
PATCH  /users/profile
PATCH  /users/password
```

---

# 3. Servers Module

Represents physical parent servers.

This should remain mostly admin-only.

## Responsibilities

- Dedicated server inventory
- Infrastructure grouping
- Hypervisor visibility

## Endpoints

```txt
GET    /admin/servers
GET    /admin/servers/:id
POST   /admin/servers
PATCH  /admin/servers/:id
DELETE /admin/servers/:id
```

---

# 4. VPS Nodes Module

Represents isolated VPS instances.

This becomes one of the core modules.

## Responsibilities

- VPS registration
- Agent secrets
- VPS ownership
- VPS lifecycle
- VPS health overview

## Endpoints

### Admin

```txt
GET    /admin/vps-nodes
GET    /admin/vps-nodes/:id

POST   /admin/vps-nodes
PATCH  /admin/vps-nodes/:id
DELETE /admin/vps-nodes/:id
```

### Tenant/User

```txt
GET    /dashboard/vps-nodes
GET    /dashboard/vps-nodes/:id
```

---

# 5. Websites Module

Customer-facing domain inventory.

This becomes the center of the non-technical dashboard.

## Responsibilities

- Website ownership
- Domain management
- VPS mapping
- Website state

## Endpoints

### User Dashboard

```txt
GET    /dashboard/websites
GET    /dashboard/websites/:id
```

### Admin

```txt
GET    /admin/websites
GET    /admin/websites/:id
PATCH  /admin/websites/:id
DELETE /admin/websites/:id
```

---

# 6. Metrics Module

This should be split internally.

```txt
metrics/
├── vps-metrics
├── web-metrics
└── analytics
```

This is critical for scalability and maintainability.

---

# 6.1 VPS Metrics Module

Raw infrastructure telemetry.

## Responsibilities

- CPU
- RAM
- Disk
- Network
- Connections

## Endpoints

### Admin Technical Dashboard

```txt
GET /admin/vps-nodes/:id/metrics/current
GET /admin/vps-nodes/:id/metrics/history
GET /admin/vps-nodes/:id/metrics/network
GET /admin/vps-nodes/:id/metrics/storage
```

## Query Examples

```txt
?range=1h
?range=24h
?range=7d
?interval=5m
```

---

# 6.2 Web Metrics Module

Customer-facing traffic metrics.

## Responsibilities

- Concurrent traffic
- Request rates
- Website uptime
- Simplified traffic analytics

## Endpoints

### User Dashboard

```txt
GET /dashboard/websites/:id/metrics/current
GET /dashboard/websites/:id/metrics/history
GET /dashboard/websites/:id/traffic
```

### Admin Dashboard

```txt
GET /admin/websites/:id/metrics
```

---

# 6.3 Analytics Module

This is important.

Do NOT overload raw metrics endpoints with business analytics.

Analytics endpoints should return already-shaped UI-ready data.

This follows:

- SRP (Single Responsibility Principle)
- CQRS-style read optimization

## Responsibilities

- Aggregations
- Chart shaping
- KPI summaries
- Trend analysis

## Endpoints

### User Dashboard

```txt
GET /dashboard/analytics/overview
GET /dashboard/analytics/websites/:id
```

### Admin Dashboard

```txt
GET /admin/analytics/infrastructure
GET /admin/analytics/top-vps-load
GET /admin/analytics/noisy-neighbors
GET /admin/analytics/system-health
```

---

# 7. Realtime Module

Socket.io gateway isolation.

## Responsibilities

- Socket authentication
- Room management
- Live ticks
- Subscription authorization

## Namespaces

```txt
/ws/dashboard
/ws/admin
```

## Room Examples

```txt
website:{websiteId}
vps:{vpsId}
tenant:{tenantId}
```

---

# 8. Alerts Module

Should be isolated early.

Many systems fail by coupling alerts with metrics logic.

## Responsibilities

- Threshold rules
- Alert states
- Dispatching
- Notification history

## Endpoints

### User

```txt
GET /dashboard/alerts
GET /dashboard/alerts/:id
```

### Admin

```txt
GET    /admin/alerts
POST   /admin/alerts/rules
PATCH  /admin/alerts/rules/:id
```

---

# 9. SSL Certificates Module

Excellent separation already exists in schema.

## Responsibilities

- SSL monitoring
- Expiration checks
- Renewal states

## Endpoints

### User

```txt
GET /dashboard/websites/:id/ssl
```

### Admin

```txt
GET /admin/ssl-certificates
GET /admin/ssl-certificates/expiring
```

---

# 10. Agent Ingestion Module

This is one of the most important architectural boundaries.

Never mix agent APIs with frontend APIs.

## Responsibilities

- Agent authentication
- Payload validation
- Ingestion pipeline
- Event emission

## Endpoints

```txt
POST /internal/agent/v1/metrics
POST /internal/agent/v1/heartbeat
```

Potential future:

```txt
POST /internal/agent/v1/websites/sync
POST /internal/agent/v1/ssl/sync
```

---

# 11. Tenant Module

Critical for multi-tenancy isolation.

## Responsibilities

- Tenant scoping
- Ownership resolution
- Row-level filtering abstraction

## Internal Usage

This module may expose services instead of public controllers.

Example:

```ts
TenantAccessService.assertWebsiteAccess();
TenantAccessService.assertVpsAccess();
```

# VERY IMPORTANT ARCHITECTURAL DECISION

You should split APIs into:

```txt
/admin/*
/dashboard/*
/internal/*
```

This is a very scalable enterprise pattern.

---

# Why This Separation Matters

## /dashboard/\*

Optimized for:

- Simplicity
- UX
- Business metrics
- Non-technical users

Responses should be:

- Aggregated
- Simplified
- Human-readable

---

## /admin/\*

Optimized for:

- Raw telemetry
- Infrastructure debugging
- Deep visibility
- Internal operations

Responses may include:

- Technical metrics
- Hypervisor states
- Raw I/O
- Internal IDs

---

## /internal/\*

Strictly machine-to-machine.

Never exposed publicly in frontend SDKs.

Used for:

- Agents
- Internal workers
- Cron systems
- Queue consumers

---

# Recommended API Evolution Strategy

Version only internal APIs initially.

```txt
/internal/agent/v1/*
```

Do NOT prematurely version frontend APIs unless needed.

---

# Important Missing Architectural Pieces

Your schema and architecture still need:

---

# 1. AlertRule Table

You currently only described alerts conceptually.

You still need:

```txt
AlertRule
AlertState
AlertHistory
```

---

# 2. Notification Module

Should become isolated later.

```txt
notifications/
├── email
├── sms
├── templates
```

---

# 3. Audit Logs

Very important for admin operations.

```txt
AuditLog
```

Track:

- Role changes
- VPS deletions
- Alert rule changes
- Manual actions

---

# 4. API Rate Limiting

Especially:

- Agent ingestion
- Auth
- WebSocket auth

---

# 5. Query Optimization Layer

At scale, dashboard APIs should NOT directly expose raw TimescaleDB tables.

Instead:

```txt
Controller
→ Query Service
→ Read Repository
→ DTO Mapper
```

This follows:

- CQRS-lite
- SRP
- OCP

---

# Recommended Frontend Dashboard Separation

You should also separate frontend apps logically:

```txt
(app)
├── (marketing)
├── (dashboard)
└── (admin)
```

This aligns perfectly with your backend architecture.
