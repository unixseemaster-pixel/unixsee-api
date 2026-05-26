```
src/
│
├── prisma/
│   ├── prisma.service.ts
│   └── prisma.module.ts
│
├── auth/
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── roles.guard.ts           ← replaces your /admin/ module
│   ├── strategies/
│   │   └── jwt.strategy.ts
│   ├── decorators/
│   │   └── roles.decorator.ts
│   ├── dto/
│   ├── auth.controller.ts
│   ├── auth.service.ts
│   └── auth.module.ts
│
├── agent/                           ← HTTPS POST from edge agents
│   ├── middleware/
│   │   └── hmac-verify.middleware.ts
│   ├── dto/
│   │   └── agent-payload.dto.ts
│   ├── agent.controller.ts
│   ├── agent.service.ts
│   └── agent.module.ts
│
├── metrics/                         ← time-series storage + REST historical queries
│   ├── dto/
│   ├── metrics.controller.ts        ← REST: 7-day charts, 24h trends
│   ├── metrics.service.ts
│   └── metrics.module.ts
│
├── servers/                         ← parent server management
│   ├── dto/
│   ├── servers.controller.ts
│   ├── servers.service.ts
│   └── servers.module.ts
│
├── vps/                             ← VPS node management
│   ├── dto/
│   ├── vps.controller.ts
│   ├── vps.service.ts
│   └── vps.module.ts
│
├── websites/                        ← website profiles + domain inventory
│   ├── dto/
│   ├── websites.controller.ts
│   ├── websites.service.ts
│   └── websites.module.ts
│
├── tenants/                         ← website owner (non-technical client) accounts
│   ├── dto/
│   ├── tenants.controller.ts
│   ├── tenants.service.ts
│   └── tenants.module.ts
│
├── users/                           ← company admin accounts
│   ├── dto/
│   ├── users.controller.ts
│   ├── users.service.ts
│   └── users.module.ts
│
├── events/                          ← SOLID: DIP abstraction — NestJS EventEmitter today, Redis tomorrow
│   ├── event-dispatcher.interface.ts
│   ├── local-event-dispatcher.service.ts
│   └── events.module.ts
│
├── alerts/                          ← evaluation engine + state machine
│   ├── services/
│   │   ├── alert-evaluation.service.ts   ← Inactive→Pending→Firing→Resolved
│   │   └── alert-dispatch.service.ts     ← calls notifications module
│   ├── dto/
│   └── alerts.module.ts
│
├── notifications/                   ← SMS / Email provider integrations
│   ├── providers/
│   │   ├── sms.provider.ts
│   │   └── email.provider.ts
│   ├── notifications.service.ts
│   └── notifications.module.ts
│
└── realtime/                        ← Socket.io only: live ticks, room management
    ├── gateways/
    │   ├── vps-metrics.gateway.ts   ← admin room: raw hardware ticks
    │   └── website-traffic.gateway.ts ← tenant room: simplified visitor counts
    ├── realtime.module.ts
    └── realtime.service.ts
```

## API Design Principles First

Before routes, three rules that govern every decision below:

1. **Versioning:** All routes live under `/api/v1/`
2. **Same URL, role-filtered response:** Admin and Tenant hit the same endpoint. The service layer shapes the response based on role. No `/admin/` prefix in URLs.
3. **Nesting max one level deep:** `/vps/:id/metrics` ✅ — `/servers/:id/vps/:id/metrics/summary/daily` ❌

---

## Complete Route Map

### Auth

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
DELETE /api/v1/auth/logout
GET    /api/v1/auth/me
```

---

### Agent Ingestion

```
POST   /api/v1/agent/ingest        ← HMAC auth, not JWT. This is a machine endpoint.
```

---

### Users

```
GET    /api/v1/users               ← ADMIN: all users | TENANT: ❌
POST   /api/v1/users               ← ADMIN only
GET    /api/v1/users/:id           ← ADMIN: any user | TENANT: own profile only
PATCH  /api/v1/users/:id           ← ADMIN: any | TENANT: own profile only
DELETE /api/v1/users/:id           ← ADMIN only
```

---

### Servers _(parent physical machines)_

```
GET    /api/v1/servers             ← ADMIN only
POST   /api/v1/servers             ← ADMIN only
GET    /api/v1/servers/:id         ← ADMIN only
PATCH  /api/v1/servers/:id         ← ADMIN only
DELETE /api/v1/servers/:id         ← ADMIN only
```

---

### VPS Nodes

```
GET    /api/v1/vps                 ← ADMIN: all nodes, full data
                                      TENANT: only their assigned nodes, simplified
POST   /api/v1/vps                 ← ADMIN only
GET    /api/v1/vps/:id             ← ADMIN: raw hardware data
                                      TENANT: uptime + simple status only
PATCH  /api/v1/vps/:id             ← ADMIN only
DELETE /api/v1/vps/:id             ← ADMIN only
```

---

### Metrics _(historical — REST only, live ticks go through Socket.io)_

```
GET    /api/v1/vps/:id/metrics           ← ADMIN: raw CPU/RAM/Disk/IOPS
                                            TENANT: ❌
                                            Query: ?range=24h | 7d

GET    /api/v1/websites/:id/metrics      ← ADMIN + TENANT (own site only)
                                            ADMIN: full technical payload
                                            TENANT: traffic volume + uptime
                                            Query: ?range=24h | 7d
```

---

### Websites

```
GET    /api/v1/websites            ← ADMIN: all | TENANT: own only
POST   /api/v1/websites            ← ADMIN only
GET    /api/v1/websites/:id        ← ADMIN: full profile + infra mapping
                                      TENANT: domain, status, storage only
PATCH  /api/v1/websites/:id        ← ADMIN only
DELETE /api/v1/websites/:id        ← ADMIN only
```

---

### Alerts

```
# Rules — threshold configuration
GET    /api/v1/alert-rules              ← ADMIN only
POST   /api/v1/alert-rules              ← ADMIN only
GET    /api/v1/alert-rules/:id          ← ADMIN only
PATCH  /api/v1/alert-rules/:id          ← ADMIN only
DELETE /api/v1/alert-rules/:id          ← ADMIN only

# Incidents — fired alert history
GET    /api/v1/alert-incidents          ← ADMIN: all | TENANT: own sites only
GET    /api/v1/alert-incidents/:id      ← ADMIN: any | TENANT: own only
GET    /api/v1/vps/:id/alert-incidents  ← ADMIN only
GET    /api/v1/websites/:id/alert-incidents ← ADMIN + TENANT (own)
```

---

## Socket.io Rooms _(not REST — listed here for completeness)_

```
room: admin:{adminId}          ← raw VPS ticks: CPU%, RAM, active connections
room: tenant:{tenantId}        ← website traffic count, uptime pulse, "High Traffic" flags
room: vps:{vpsId}              ← scoped feed for a single node detail page
room: website:{websiteId}      ← scoped feed for a single website detail page
```

---

## Decision Notes

**Why `alert-rules` and `alert-incidents` are separate resources:**
Rules are configuration (rarely change). Incidents are an append-only event log. Different lifecycles, different consumers.

**Why metrics are nested under their parent (`/vps/:id/metrics`):**
Metrics have no identity without their owner. You never query metrics in isolation — always "metrics _for_ this VPS." Nesting communicates that ownership clearly.

**Why there is no `/api/v1/admin/` prefix:**
Covered in the previous session. Role guard on the handler. The URL describes the resource, not the audience.
