# System Architecture & Data Strategy Document

---

## 1. Edge Agent Data Collection Strategy (LiteSpeed & DirectAdmin)

The agent operates as a lightweight, scheduled background worker inside each isolated VPS. It minimizes resource consumption and prevents server overhead during heavy WooCommerce traffic spikes by completely avoiding raw log parsing.

### System Metrics (OS & Hypervisor Level)

- **Source:** /proc filesystem and standard core Linux utilities.
- **Collected Metrics:** CPU utilization percentages, RAM allocation (active vs. cached), Disk I/O operations per second (IOPS), and file system storage capacity.

### Website & Traffic Metrics (Application Level)

- **Source:** LiteSpeed Real-Time Status memory files (located at /tmp/lshttpd/.rtreport or .rtreport.2) and DirectAdmin configuration manifests (/usr/local/directadmin/data/users/).
- **Collected Metrics:**
- **Per-VPS Global:** Total active HTTP/HTTPS connections, instantaneous bandwidth consumption, and overall uptime.
- **Per-Website Inventory:** Dynamic discovery of active domains, subdomains, mapping home directories, and identifying the corresponding DirectAdmin user account.
- **Per-Website Traffic:** Live concurrent request counts and processing states extracted directly from the pre-aggregated LiteSpeed report file in microseconds.

---

## 2. PostgreSQL Storage Pattern for TimescaleDB Migration

To achieve high write-throughput for time-series data while maintaining seamless forward-compatibility with TimescaleDB, the database must use **Polyglot Persistence Layout** splitting relational data from temporal data.

### Relational Metadata (Standard PostgreSQL Tables)

- **Data Types:** Company Admins, Tenants (Website Owners), Parent Servers, VPS Nodes, and Website Profiles.
- **Schema Design:** Standard normalization utilizing foreign key constraints, indexes on lookup keys, and auto-incrementing surrogate keys.

### Metrics & Traffic Payload (Future TimescaleDB Hypertables)

- **Data Types:** All time-stamped periodic metrics received from the agent.
- **Design Rules for Seamless Conversion:**

1. **Composite Primary Key:** The table must omit traditional singular serial primary keys. Instead, it must utilize a composite primary key consisting of the exact timestamp field and the relation identifier (e.g., (recorded_at, vps_id)).
2. **Immutability:** Data must strictly be append-only. No application logic should ever run UPDATE queries against metric historical data.
3. **Timestamp Standardization:** The temporal column must use the TIMESTAMP WITH TIME ZONE data type to guarantee compatibility with TimescaleDB’s internal time-chunking mechanisms.

---

## 3. Real-Time Distribution Architecture (NestJS Backend)

The core backend exposes an asynchronous HTTPS ingestion endpoint for agents while managing user dashboard sessions using two distinct transportation layers.

```
[ Edge Agent ] ──────[ POST ]───► HTTPS Ingestion ───► PostgreSQL (Save)
                                       │
                                       ▼ (Triggers)
                                 Local Event Bus
                                       │
                                       ▼ (Broadcasts)
[ Next.js App ] ◄────[ Sub ]─────► Socket.io Gateway
[ Next.js App ] ◄────[ GET ]─────► HTTPS REST API ────► PostgreSQL (Historical)

```

### Inbound (Agent to Backend Ingestion)

- **Protocol:** Outbound HTTPS POST on a strict 30-to-60-second interval.
- **Security:** Request validation through a custom middleware executing a fast cryptographically secure HMAC verification or token validation on the header.

### Outbound (Backend to Frontends)

- **HTTPS REST API:** Delivers **Historical & Structural Data**. This handles heavy analytical payloads such as 7-day resource usage charts, 24-hour traffic trends, system log events, and account management details.
- **WebSockets (Socket.io):** Delivers **Volatile Live Ticks**. This transmits low-latency heartbeat objects containing only instant numbers (e.g., current concurrent visitors or real-time CPU spikes).

---

## 4. Next.js Dashboard Presentation Layer

The frontend balances heavy historical analytical views with engaging real-time user experiences, segmented by targeted interfaces.

- **HTTPS Fetching Pipeline:** Next.js uses client-side data fetching hooks (such as TanStack Query) to pull historical metrics from REST endpoints. It caches this data to prevent repeated rendering performance lags when users switch tabs.
- **Socket.io Stream Subscription:** When a component mounts, it initiates a secure WebSocket connection and joins a restricted room identifier matching its specific scope. It updates localized React states exclusively for streaming graphical indicators.
- **UI Lifecycle Performance:** Components strictly run connection teardowns on unmount to prevent lingering background channels from draining the user's browser processing power.

---

## 5. Scalable Event Bus Design (NestJS to Redis)

To decouple database writes from the live user notification pipeline, the backend relies on an internal event-driven communication structure.

- **Current Architecture:** Upon receiving an agent payload, the ingestion controller persists the data to the database and immediately invokes the native NestJS @nestjs/event-emitter. The Socket.io gateway components listen for these process-bound events natively in memory to push data to active client sockets.
- **Abstraction Layer Strategy:** All events are driven by a unified interface wrapper layer (an abstract Event Dispatcher Service).
- **Future Redis Upgrade Path:** When horizontal scaling across multiple NestJS instances is required, developers will not touch any controller or gateway logic. They will simply swap out the internal execution code of the Event Dispatcher Service to publish messages into a **Redis Pub/Sub channel** or bind a Redis adapter directly to the Socket.io server layer.

---

## 6. Multi-Tenant Role & Authorization Separation

Data visibility and presentation constraints are handled via strict role-based authorization layers across two primary user profiles.

### Company Administrator View

- **Access Scope:** Full system visibility across the entire infrastructure topology.
- **Data Resolution:** Unfiltered technical metrics including raw hardware capacities, hypervisor alerts, network topology status, noisy neighbor identification, and across-the-board VPS diagnostics.

### Website Owner View (Non-Technical Clients)

- **Access Scope:** Strictly bound to their specific tenant space using relational database row filtering.
- **Data Resolution:** Simplified, business-oriented metrics. They see high-level website traffic volumes, uptime statuses, simple visual warnings (e.g., "High Traffic Detected"), and storage utilization. Complex infrastructure jargon is completely hidden behind user-friendly abstractions.
