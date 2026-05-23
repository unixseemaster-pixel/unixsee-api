## Implementation Plan: Core Backend Monitoring Application (NestJS)

---

### Phase 1: Architecture Blueprint & Project Setup

**Goal:** Establish a scalable, unified NestJS backend designed around modern configuration rules, separating the relational business models from the high-velocity ingestion endpoints.

#### Strategic Considerations & Architecture

- **Modern Node/TS Setup:** Initialize NestJS using ECMAScript Modules (ESM) to match the edge agent.
- **Prisma v7 Conventions:**
- Leverage Prisma 7's architecture (which utilizes a native Wasm/TypeScript query compilation architecture, eliminating the legacy Rust engine and dropping bundle overhead).
- Configure prisma.config.ts in the project root to manage database connection configurations using defineConfig cleanly.
- Use the Prisma 7 default provider = "prisma-client" in your schema, coupled with the required @prisma/adapter-pg driver adapter.

#### Action Steps

1. **Project Initialization:** Create a clean NestJS workspace. Set up a core schema with essential user structures, ensuring tenant boundaries are isolated.
2. **Prisma v7 Integration:** Set up the global configuration structure.

- _Root Configuration:_ Create prisma.config.ts:

```typescript
import { defineConfig, env } from 'prisma/config';
export default defineConfig({
  schema: 'prisma/schema.prisma',
  datasource: { url: env('DIRECT_DATABASE_URL') },
});
```

```
    *   *Schema Layout:* Define base models (User, Server, Vps, Website). Ensure metric schemas are prepared for simple data appending.
3.  **Client Driver Instantiation:** Create a unified PrismaService loading the required driver adapters natively to handle persistent PostgreSQL routing connections cleanly.

---

### Phase 2: Secure Agent Ingestion Engine (The POST Endpoint)
**Goal:** Implement a highly optimized, bulletproof HTTPS ingestion controller capable of parsing, cryptographically validating, and appending edge telemetry payloads into PostgreSQL.

#### Strategic Considerations & Architecture
*   **Decoupled Handshake:** The ingestion layer must process database writes instantly and pass the payload to the local memory loop, avoiding delays that block the agent.
*   **Cryptographic Security:** Guard endpoints using a custom NestJS Guard or Middleware that validates custom headers (X-Agent-Signature) against a local Tenant Secret.

#### Action Steps
1.  **Ingestion Route Generation:** Define a restricted POST /api/v1/ingest/metrics endpoint.
2.  **Signature Guard Implementation:** Build an authorization guard that intercepts inbound requests, generates a local **HMAC-SHA256** token using the payload combined with the X-Agent-Timestamp header, and drops requests instantly if signatures conflict.
3.  **Persist & Emit Flow:** Inside the controller, write the incoming data arrays to PostgreSQL using single batch operations via Prisma. Immediately after success, distribute the raw object payload to the application's local event bus.

---

### Phase 3: Real-Time Communication Hub (Socket.io Gateway)
**Goal:** Build a robust, real-time message distribution gateway using NestJS WebSockets to stream incoming data directly to active dashboard sessions without creating data leakage between tenants.

#### Strategic Considerations & Architecture
*   **Dynamic Room Subscriptions:** Dashboard connections must register to private channel identifiers keyed explicitly by their allowed scope (e.g., vps:id or website:id).
*   **State Insulation:** Ensure that when an agent updates a data point, the backend avoids broadcasting globally. It must filter and transmit data specifically to matching room subscriptions.

#### Action Steps
1.  **WebSocket Gateway Creation:** Deploy a MetricsGateway utilizing NestJS WebSockets backed by socket.io.
2.  **Room Registration Protocol:** Implement a subscription listener (join_vps_room). Inside the handler, read the client’s session parameters and use Socket.io's native socket.join(roomName) API to establish a locked communication group.
3.  **Local Memory Listener:** Bind a reactive listener (@OnEvent('metrics.updated')) that taps into the local event bus. When a new chunk arrives, forward the raw metrics strictly to the matching Socket.io room channel.

---

### Phase 4: Customer REST API Layer (Next.js Data Provider)
**Goal:** Design the read-only RESTful HTTP endpoints that feed historical timelines and layout structures down to the Next.js frontend application via traditional GET actions.

#### Strategic Considerations & Architecture
*   **Strict Access Scoping:** Every user request must pass through a Tenant Isolation layer to ensure website owners can only access data belonging to their verified identity.
*   **Non-Technical UI Filtering:** Aggregation endpoints should automatically translate dense infrastructure telemetry into simple, readable indicators suitable for everyday website owners.

#### Action Steps
1.  **Historical Metrics Querying:** Build GET /api/v1/metrics/history endpoints utilizing Prisma v7 to fetch time-bucketed resource usage logs (e.g., last 24 hours).
2.  **Website Traffic Aggregator:** Implement specific tracking endpoints designed to return high-level, business-critical indicators such as peak concurrent request numbers and recent visitor trends.
3.  **Company Administrative Context:** Build parallel endpoints reserved exclusively for root platform managers (GET /api/v1/admin/servers/overview). These bypass tenant boundaries to expose advanced infrastructure metrics like raw hardware capacities and cross-cluster anomalies.

---

### Phase 5: Production Longevity & Future Scaling Blueprints
**Goal:** Document clear upgrade hooks within the NestJS system design so that migrating to Redis, TimescaleDB, or independent alerting engines later can be completed with minimal code friction.

#### 1. Transitioning the Local Event Bus to Redis Pub/Sub
*   *Current State:* NestJS processes handle agent communications in-memory via internal EventEmitters.
*   *Scaling Strategy:* When horizontal scaling demands running multiple instances behind a load balancer, drop the native emitter package and bind a Redis adapter directly to the Socket.io server. The application code remains unchanged; events publish into an external Redis Pub/Sub ring, ensuring consistent real-time delivery across all backend instances.

#### 2. Transitioning Metrics Storage to TimescaleDB
*   *Current State:* Time-series telemetry appends directly to standard, append-only PostgreSQL relational tables.
*   *Scaling Strategy:* Because the metric layout uses a composite primary key consisting of standard timestamp data types ((recorded_at, vps_id)), converting to TimescaleDB requires running a single SQL schema migration to switch the target tables into hyper-optimized *hypertables*. Prisma v7 queries will function identically, but database performance will stay fast even with massive volumes of historical data.

#### 3. Transitioning the Incident Alerting Module
*   *Current State:* The core backend evaluates metric thresholds on-the-fly using asynchronous in-memory event loops right after the ingestion pipeline finishes writing.
*   *Scaling Strategy:* When ingestion frequency expands, decouple evaluation completely by passing payloads directly into a Redis-backed distributed queue engine (such as BullMQ). This moves the computational load to isolated background worker pools, keeping your primary Web API highly responsive.

```
