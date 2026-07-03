Below is the complete, comprehensive `agent.md` instruction file designed specifically for an AI developer agent. It acts as an elite technical brief, framing the product vision, domain rules, constraints, architectural patterns, and exact step-by-step implementation tasks for the core backend.

---

# File Name: `agent.md`

## 1. Executive Summary & Core Mission

You are an expert full-stack and software architecture AI agent. Your mission is to build the initial phase of **UnixSee**, a specialized real-time monitoring platform tailored for a WordPress WooCommerce hosting provider.

### The Target Infrastructure Context

The target environment does not use Docker or Nginx. Instead, it relies on a high-performance bare-metal setup utilizing **DirectAdmin** as the hosting panel and **LiteSpeed Enterprise** as the web server. The infrastructure layout follows a strict nested hierarchy:

$$\text{Parent Physical Server} \longrightarrow \text{Multiple VPS Instances} \longrightarrow \text{Multiple WooCommerce Websites per VPS}$$

### The Data Challenge

WooCommerce sites are highly dynamic and prone to extreme traffic spikes (e.g., flash sales driving thousands of concurrent requests). A custom, lightweight telemetry edge agent runs inside each VPS, scraping local metrics and pushing data packets to our core backend every 30 to 60 seconds.

---

## 2. Phase 1 Scope & Technical Stack Constraints

To ensure swift deployment and high stability, Phase 1 focuses on a highly performant, monolithic-first architecture optimized to manage **100–200 VPS instances** (supporting roughly 1,000–2,000 active websites). Avoid over-engineering with distributed microservices on day one.

### Technical Stack Requirements (Strict 2026 Standards)

- **Backend Framework:** NestJS with TypeScript using **ECMAScript Modules (ESM)**.
- **Database ORM:** **Prisma v7** (utilizing the new native WebAssembly/TypeScript engine to eliminate legacy Rust compiler binary overhead).
- **Database Engine:** Standard PostgreSQL (structured intentionally to support a drop-in migration to TimescaleDB later).
- **Real-Time Transport:** WebSockets via the official NestJS `@nestjs/websockets` module backed by `socket.io`.
- **Internal Communication Bus:** Local process memory via `@nestjs/event-emitter`.

---

## 3. Product Requirements & Multi-Tenant Separation

The backend serves two distinct target audiences, requiring strict data isolation and representation layers at the API boundary:

### 1. Website Owners (Non-Technical WooCommerce Merchants)

- **The Experience:** They need a clean, non-intimidating, high-level overview. High technical jargon must be abstracted behind user-friendly visual cues.
- **Metrics Allowed:** Uptime status, live concurrent visitors count, current storage usage, and simplified warning flags (e.g., "High Traffic Peak Detected").
- **Security Boundary:** Must be completely sandboxed. Row-Level Security / strict scoping filters must prevent users from accessing data belonging to any other user or VPS instance.

### 2. Company Administrators (Internal Hosting Support Team)

- **The Experience:** They need total visibility to identify server issues, "noisy neighbor" websites draining resources, or hardware capacity breaches.
- **Metrics Allowed:** Raw hardware resource profiles (Unfiltered CPU metrics, RAM caching breakdowns, disk IOPS constraints, network interface cards load) and complete cross-server topological overviews.

---

## 4. Forward-Compatible Database Schema (`prisma.schema`)

The metric storage tables must be engineered as **append-only, immutable logs**. This ensures we can easily convert them into TimescaleDB _hypertables_ using a single SQL command down the road without rewriting any queries.

### Rules for the Metric Models:

1. **No Auto-Incrementing Primary Keys:** Time-series hyper-tables require a composite key containing the timestamp.
2. **Explicit Timestamps:** The timestamp column must use `DateTime` with timezone mapping.

### Initial Phase 1 Schema Definition:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider        = "prisma-client-js"
  previewFeatures = ["driverAdapters"]
}

enum Role {
  ADMIN
  USER
}

model User {
  id        String    @id @default(uuid())
  email     String    @unique
  password  String
  role      Role      @default(USER)
  websites  Website[]
  createdAt DateTime  @default(now())
}

model Server {
  id        String   @id @default(uuid())
  name      String   @unique
  ipAddress String
  vpsNodes  Vps[]
  createdAt DateTime @default(now())
}

model Vps {
  id          String       @id @default(uuid())
  serverId    String
  server      Server       @relation(fields: [serverId], references: [id], onDelete: Cascade)
  machineId   String       @unique // Matches /etc/machine-id from Agent
  name        String
  secretKey   String       // Used for verification of HMAC signing
  websites    Website[]
  vpsMetrics  VpsMetric[]
  webMetrics  WebMetric[]
  createdAt   DateTime     @default(now())
}

model Website {
  id         String      @id @default(uuid())
  vpsId      String
  vps        Vps         @relation(fields: [vpsId], references: [id], onDelete: Cascade)
  userId     String
  user       User        @relation(fields: [userId], references: [id], onDelete: Cascade)
  domain     String      @unique
  docRoot    String      // Absolute path in VPS
  webMetrics WebMetric[]
  createdAt  DateTime    @default(now())
}

// IMMUTABLE TIME-SERIES READY PROFILE 1: VPS Telemetry
model VpsMetric {
  recordedAt DateTime @default(now())
  vpsId      String
  vps        Vps      @relation(fields: [vpsId], references: [id], onDelete: Cascade)
  cpuUsage   Int      // Scale of 0-100
  ramUsage   Int      // Scale of 0-100
  diskIops   Int
  bandwidth  BigInt

  @@id([recordedAt, vpsId]) // Composite Key fundamental for TimescaleDB Hypertables
}

// IMMUTABLE TIME-SERIES READY PROFILE 2: LiteSpeed Traffic Scrapes
model WebMetric {
  recordedAt        DateTime @default(now())
  vpsId             String
  vps               Vps      @relation(fields: [vpsId], references: [id], onDelete: Cascade)
  websiteId         String
  website           Website  @relation(fields: [websiteId], references: [id], onDelete: Cascade)
  activeConnections Int      // Extracted from LiteSpeed rtreport
  requestRate       Int      // Requests processed within loop window

  @@id([recordedAt, websiteId]) // Composite Key fundamental for TimescaleDB Hypertables
}

```

---

## 5. Architectural Blueprints (How data flows)

```
[ Edge Agent ] ────( HTTPS POST Payload )───► [ Ingestion Controller ]
                                                        │
                                                        ▼ (Step 1: Write to PostgreSQL)
                                                   Prisma Client
                                                        │
                                                        ▼ (Step 2: Emit Local Process Event)
                                                 NestJS EventEmitter
                                               /                      \
                                              ▼                        ▼
                       [ Socket.io Real-Time Gateway ]      [ Incident Alerting Engine ]
                                      │                                │
                                      ▼ (Stream Live Ticks)            ▼ (In-Memory State Check)
                           [ User/Admin Dashboard ]           [ Asynchronous Email/SMS Dispatch ]

```

---

## 6. Step-by-Step Backend Implementation Guide

### Phase 1: Core Configuration & Prisma v7 Driver Bootstrapping

- Configure NestJS to run as an **ES Module (ESM)** system environment.
- Implement `prisma.config.ts` using the new Prisma 7 boilerplate patterns.
- Instantiate `PrismaService` to use `@prisma/adapter-pg` along with the core `pg` pooled clients.

### Phase 2: Secure Agent Ingestion Middleware & Router

- Create a dedicated router endpoint: `POST /api/v1/ingest/metrics`.
- Implement a custom security `Guard` that protects this route. It must parse incoming headers for `X-Agent-Signature` and `X-Agent-Timestamp`.
- The Guard must pull the target `Vps.secretKey` based on the payload identity, compute a local **HMAC-SHA256** hash, and compare signatures to prevent unauthorized entry.
- On verification, the controller executes a high-speed Prisma batch write. **Immediately after the write is resolved**, use `@nestjs/event-emitter` to broadcast the data packet onto the internal memory pipeline (`this.eventEmitter.emit('metrics.ingested', payload)`), and respond with a `201 Created` status code to release the agent.

### Phase 3: Socket.io Context Multi-Tenant Isolation

- Deploy a global NestJS `MetricsGateway` leveraging `socket.io`.
- Implement a custom handshake validation interceptor that authenticates dashboard users (Next.js clients) and establishes their access roles.
- Configure a channel join message listener (`join_vps_room`). Verify if the caller's session permissions allow access to that specific `vpsId`. If access is granted, lock them into an isolated communication group channel using `socket.join("vps_" + vpsId)`.
- Implement an event consumer `@OnEvent('metrics.ingested')`. When triggered, parse out the metrics and immediately broadcast a lightweight data packet containing only real-time metrics strictly to the matching Socket.io room (`this.server.to("vps_" + payload.vpsId).emit('live_tick', data)`).

### Phase 4: Read-Only Dashboard REST Layer

- **For Customers:** Build user endpoints like `GET /api/v1/client/metrics/summary`. Use Prisma to pull historical aggregates (e.g., last 24 hours of traffic peaks). Implement strict tenancy parameters to ensure users can only query their authorized `userId` fields.
- **For System Administrators:** Build comprehensive administrative endpoints like `GET /api/v1/admin/infrastructure/overview`. These bypass traditional tenant validation rules, providing unfiltered data on overall cluster resource consumption and server environments.

### Phase 5: In-Memory Lifecycle Incident Alerting

- Implement a reactive `AlertEvaluationService` listening continuously to the internal memory bus (`@OnEvent('metrics.ingested')`).
- To stay performant at our current scale, avoid frequent database scans. Instead, store active alert lifecycle thresholds in an internal application map.
- Track metric variations against alert definitions directly inside the application's thread state machine. Follow this state mapping pattern:

$$\text{Inactive} \longrightarrow \text{Pending (Breached but waiting verification)} \longrightarrow \text{Firing} \longrightarrow \text{Resolved}$$

- If an alert remains breached beyond the required safety period (e.g., sustained CPU over 90% for 3 cycles), pass the execution object asynchronously to the `NotificationDispatcherService`. Trigger third-party delivery interfaces natively via independent microtasks without blocking the primary request loop.

---

## 7. Future Proof Separation Axioms (Do Not Violate)

To ensure the backend scales smoothly when migrating to a larger platform architecture later, you must enforce these code patterns:

- **Isolate Event Channels via Wrappers:** Never let gateway handlers mix logic directly with event emitters. Wrap emissions within an abstract wrapper service. This ensures that when we add **Redis Pub/Sub** horizontal distribution later, we only change the wrapper implementation, leaving the core application code untouched.
- **No Metric Updates:** Write all metric endpoints purely as `INSERT` or read-only queries. Never invoke `UPDATE` or `UPSERT` commands on metrics tables. This guarantees the data remains perfectly structured for conversion into a **TimescaleDB hypertable**.
- **Decoupled Alert Processing:** Keep alert processing rules cleanly separated from notification configuration keys. This ensures we can easily lift and drop the evaluator services directly into a separate **BullMQ worker thread** down the line without breaking the system.

---

## 8. Production Logging and Request Tracing Rules

The backend must use a small, dependency-free logging strategy based on the built-in NestJS `Logger`, wrapped by the project logger utilities.

### Logger wrapper

- Use `createAppLogger(ContextName)` from `src/common/logging/app-logger.ts` in all controllers, services, guards, gateways, listeners, and scheduled workers that perform I/O, auth, DB access, event dispatching, socket work, scheduled jobs, or important business decisions.
- Do not use raw `new Logger(...)` in feature code. Raw Nest Logger usage must stay isolated inside the wrapper.
- Class context is the Nest log context that identifies where a log came from. Example: `createAppLogger(AgentService.name)` produces logs with the `AgentService` context. Pure stateless calculation helpers may remain unlogged unless they make a decision that must be audited.


### Environment level policy

Logger levels must be selected from `APP_ENV` first, with `NODE_ENV` only as fallback. This is required because staging runs optimized production Node behavior while still needing staging observability.

| Environment | Required env values | Enabled levels |
| --- | --- | --- |
| Development | `APP_ENV=development`, `NODE_ENV=development` | `log`, `warn`, `error`, `debug`, `verbose`, `fatal` |
| Staging | `APP_ENV=staging`, `NODE_ENV=production` | `log`, `warn`, `error`, `debug`, `fatal` |
| Production | `APP_ENV=production`, `NODE_ENV=production` | `log`, `warn`, `error`, `fatal` |
| Test | `APP_ENV=test`, `NODE_ENV=test` | `error`, `fatal` |

Do not use `NODE_ENV` alone to decide logger levels.

### Request ID propagation

- HTTP requests must run through `requestContextMiddleware`.
- The middleware must accept an incoming `x-request-id` header or generate a UUID, set `response.setHeader('x-request-id', requestId)`, and store the value with `AsyncLocalStorage`.
- Downstream logs must include `requestId` automatically through the logger wrapper.
- Auth guards/services should call `RequestContext.setUserId(userId)` after the caller is known.

### Log format

Use stable event names and structured shallow metadata:

```ts
private readonly logger = createAppLogger(AgentService.name);

this.logger.log('agent.ingest.stored', {
  machineId,
  batchSize,
  vpsInserted,
  webInserted,
  durationMs,
});
```

Avoid prose-only logs such as:

```ts
this.logger.log(`Agent ingest stored for ${machineId}`);
```

### Levels

| Level | Use |
| --- | --- |
| `debug` | Noisy flow details, request success traces, event fanout counts, successful socket tick diagnostics. Off in production by default. |
| `verbose` | Very detailed investigation-only logs. Avoid in hot paths. |
| `log` | Important successful business/runtime events: app started, agent batch stored, user logged in, website created, probe cycle completed. |
| `warn` | Recoverable or suspicious cases: invalid credentials, HMAC rejection, timestamp drift, duplicate/idempotent batches, probe down, slow requests. |
| `error` | Operation failed and needs attention: DB write failed, event handler failed, socket authorization check failed, external provider failed. |
| `fatal` | Startup/config failures where the process cannot safely continue. |

### Safety rules

- Never log passwords, JWTs, refresh tokens, HMAC secrets, HMAC signatures, activation tokens, cookies, authorization headers, OTP codes, raw request bodies, or full telemetry payloads.
- Do not log per-metric rows in ingestion. Log one batch summary with counts and duration.
- Do not log full Prisma models. Log IDs, domains, counts, status codes, durations, and safe enum/status values.
- For guard failures, log a safe reason: `headers_missing`, `timestamp_drift`, `machine_unknown`, or `signature_invalid`.
- For Socket.io, log connection/session outcomes and authorization failures. Keep high-frequency live tick broadcasts unlogged or `debug` only.
- For uptime failures, include diagnostic fields: `domain`, `failurePhase`, `statusCode`, `responseTimeMs`, `ttfbMs`, `dnsMs`, `connectMs`, `tlsHandshakeMs`, and `errorMessage`.
