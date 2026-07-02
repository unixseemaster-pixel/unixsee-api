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
- **WebSockets (Socket.io):** Delivers **Volatile Live Ticks**. This transmits low-latency heartbeat objects containing current traffic load state and real-time CPU spikes without claiming exact online user counts.

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

---

## 7. Incident Alerting Architecture

The alerting module is split into two layers: **Evaluation** (detecting the problem) and **Dispatching** (sending the notification). By decoupling these layers using NestJS events, you can scale the system up later without rewriting your business logic.

```
[ Edge Agent ] ───( HTTPS POST )───► [ Core Backend Ingestion ]
                                                │
                                                ▼ (1. Saves to DB)
                                           PostgreSQL
                                                │
                                                ▼ (2. Emits Natively)
                                         Local Event Bus ──────► [ Alert Evaluation Engine ]
                                                                             │
                                                                             ▼ (If Breach Confirmed)
                                                                      [ Alert Dispatch Service ] ──► [ SMS / Email ]

```

---

### Phase 1: Current Scale Implementation (100–200 VPSs)

At your current size, we want to evaluate alerts instantly in-memory without running heavy background cron jobs that constantly stress your database.

#### 1. Evaluation Layer (Core Backend Memory)

- **The Mechanism:** The edge agent sends the metrics payload to the core backend via HTTPS POST. The core backend saves this data to PostgreSQL. **Immediately after the save succeeds**, the backend throws that payload onto the native NestJS EventEmitter and responds 201 Created to the agent.
- **The Evaluator:** A dedicated AlertEvaluationService inside the backend listens for this internal memory event. It matches the metrics against the specific threshold rules for that VPS (stored in a fast cache/memory map on startup).
- **State Tracking:** To prevent spamming users during a 5-second CPU spike, the service tracks the lifecycle state of the alert in the backend server's memory:

$$\text{Inactive} \longrightarrow \text{Pending (Breached but waiting)} \longrightarrow \text{Firing} \longrightarrow \text{Resolved}$$

#### 2. Dispatching Layer (Asynchronous Tasks)

- **The Mechanism:** If the evaluation service decides an alert has crossed the threshold for too long, it calls the AlertDispatchService.
- **Execution:** The backend triggers the third-party SMS or Email API asynchronously. Because it runs on a background event loop separate from the main controller, external network delays from your SMS provider will never slow down your core application.

---

### Phase 2: Future Scaled Implementation (1,000+ VPSs)

When you scale horizontally—meaning you run **multiple instances** of your core backend behind a load balancer—inline memory evaluation will fail because instance A won't know what instance B is doing, and the sheer volume of alerts will threaten system performance.

```
[ Edge Agent ] ───( HTTPS POST )───► [ Core Backend Instance A or B ]
                                                │
                                                ▼ (Saves to DB)
                                          TimescaleDB ◄─── (Computes 5m Averages Automatically)
                                                ▲
                                                │ (Queries database every 1m)
                                      [ Background Worker Pool ]
                                                │
                                                ▼ (If Breach Confirmed)
                                           Redis / BullMQ ───► [ Dedicated Dispatch Workers ] ──► [ SMS / Email ]

```

#### 1. Decoupled Evaluation Layer (Database & Worker Pool)

- **The Shift:** Instead of evaluating metrics the microsecond they arrive at the backend API, the system moves to a **Pull-Based Evaluation Engine** running on dedicated background worker processes.
- **The Mechanism:** The core backend simply receives the agent's HTTPS POST data and drops it straight into TimescaleDB.
- **The Query:** Isolated background workers query TimescaleDB **Continuous Aggregates** (automatic background calculations) every 60 seconds to find sustained issues (e.g., _Which VPSs have averaged >90% CPU for the last 5 minutes?_).
- **State Tracking:** Because you have multiple backend instances, alert states (Pending, Firing, Resolved) are moved out of local server memory and saved into a dedicated PostgreSQL table (alert_states) so all instances share the exact same state.

#### 2. Distributed Dispatching Layer (Redis / BullMQ)

- **The Shift:** At scale, sending thousands of simultaneous alerts will hit API rate limits or cause timeouts.
- **The Mechanism:** When a background worker detects a valid alert, it pushes a small JSON job into **Redis using BullMQ**.
- **Queue Control:** BullMQ workers gracefully throttle outbound notifications, retry failed API requests if an SMS provider goes down, and handle deduplication to ensure website owners are never spammed.
