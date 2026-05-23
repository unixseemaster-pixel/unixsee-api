## Implementation Plan: Edge Monitoring Agent (Node.js & TypeScript)

---

### Phase 1: Environment Setup & Project Initialization

**Goal:** Initialize a lightweight, secure, memory-optimized TypeScript environment engineered to run natively within a Linux host or VPS environment without Docker overhead.

#### Action Steps

1. **Project Provisioning:** Initialize a Node.js project using TypeScript configured for **ECMAScript Modules (ESM)** to maximize runtime efficiency and use native 2026 dependency patterns.
2. **Strict Compilation Rules:** Configure tsconfig.json with target: "ES2022" (or later) and strict: true. Enable source maps for clean debugging patterns in production.
3. **Dependency Strategy:** Keep external production dependencies to a strict minimum to preserve a tiny memory footprint. Use only necessary system abstraction utilities (such as a lightweight HTTP client like undici if needed, though native fetch is preferred).
4. **Security Hardening:** Configure the project execution profile to run under a restricted system user account (e.g., monitoring-agent). Use Linux Access Control Lists (ACLs) where necessary to grant read-only access _only_ to specific diagnostic directories. **Never run the runtime engine as root.**

---

### Phase 2: Host Identity & DirectAdmin Discovery Core

**Goal:** Programmatically resolve the identity of the specific VPS and scan the local file system to map out hosting structures and website footprints automatically.

```
                  ┌──► Read /etc/machine-id (Unique Node Identifier)
                  │
[ Discovery Loop ]┼──► Read /usr/local/directadmin/data/users/
                  │         └── Identify Local Subdomains & Domain Aliases
                  │
                  └──► Parse Linux Home Directories (Validate Directory Bounds)

```

#### Action Steps

1. **Unique Node Fingerprinting:** Implement an identity helper that extracts the host identification string directly from /etc/machine-id or /var/lib/dbus/machine-id. Cache this value in memory as the unique hardware binding key.
2. **DirectAdmin Domain Engine:** Implement a file-system discovery module that scans the local DirectAdmin user structure at /usr/local/directadmin/data/users/.
3. **Parsing Configuration Manifests:** Read and parse each user's domains.list and associated nested configuration manifests asynchronously to extract:

- Primary Domain Names
- Subdomains and Domain Pointers (Aliases)
- System User Owners
- Absolute paths to target Document Roots (public_html mapping)

---

### Phase 3: High-Performance Metric Extraction Modules

**Goal:** Gather system and application performance metrics using high-efficiency, non-blocking native file reads, bypassing slow shell execution pipelines.

#### Action Steps

1. **Low-Allocation OS Metric Engine:** Implement asynchronous file stream reads directly from the Linux /proc filesystem to avoid the heavy resource cost of spawning shell sub-processes (like top or free).

- **CPU:** Parse /proc/stat sequentially across cycles to calculate precise Delta utilization percentages.
- **Memory:** Parse /proc/meminfo to extract true active resource pressure (MemTotal, MemAvailable, Buffers, Cached).
- **Disk I/O:** Parse /proc/diskstats or extract storage volume allocation directly via fs.statfs on targeted partitions.

2. **Zero-Log LiteSpeed Status Scraper:** Implement a parser optimized for high-traffic environments. **Do not tail or parse raw access logs.** Instead, read the pre-aggregated LiteSpeed real-time reporting data block directly from the local filesystem:

- Locate the status reporting file (typically written into /tmp/lshttpd/.rtreport or /tmp/lshttpd/.rtreport.2).
- Extract instantaneous global statistics: Active HTTP/HTTPS connections, idle workers, and overall throughput.
- Extract per-virtual-host statistics: Isolate individual traffic numbers mapping back to the domains discovered in Phase 2.

---

### Phase 4: Local Aggregation & Batch Ingestion Engine

**Goal:** Buffer, normalize, and ship metric payloads securely via a single outbound transmission, protecting both the host and the central backend from packet spamming.

```
[ Metrics / Traffic Collectors ]
               │
               ▼ (Collect every 5-10s into memory arrays)
    [ Local Moving-Average Window ]
               │
               ▼ (Compute Mean/Max at 60s Mark)
    [ Outbound JSON Aggregator ] ───( HTTPS POST )───► Central Backend API

```

#### Action Steps

1. **The Collection Interval:** Set up an internal execution loop that checks hardware and LiteSpeed states every 5 to 10 seconds.
2. **In-Memory Aggregator:** Instead of pushing individual values instantly, push data points into a rolling memory buffer. When the 60-second transmission interval hits, calculate stable mathematical representations:

- **Average Values:** Used for systemic metrics (e.g., Mean CPU, Mean RAM).
- **Peak Spike Values:** Used for connection volumes (e.g., Maximum Concurrent Requests reached during that minute window).

3. **Outbound Transportation Engine:** Structure a compact JSON schema string matching the expectations of the core backend. Use the native Node.js fetch client to dispatch a secure outbound **HTTPS POST** request to the central backend.
4. **Network Resilience Management:** Implement an intelligent retry policy utilizing **Exponential Backoff with Jitter**. If the central backend is momentarily unreachable due to high traffic, the agent must store a limited queue of past iterations in memory, safely discarding the oldest packets first if memory limits are reached.

---

### Phase 5: Cryptographic Security & Firewall (CSF) Configuration

**Goal:** Enforce authentication security and guarantee smooth firewall traversal with zero required inbound modifications on client instances.

#### Action Steps

1. **Outbound Whitelisting:** Since the agent relies 100% on a Push model, verify that the host's **ConfigServer Security & Firewall (CSF)** configuration allows outbound TCP traffic on port 443 to the specific IP address of your central monitoring backend server. **Do not configure any inbound listening rules.**
2. **Cryptographic Request Signing:** Establish an initialization procedure where the agent receives a unique cryptographic Secret Key during customer onboarding.
3. **HMAC Generation Pipeline:** For every single outbound HTTPS payload, generate a Hash-based Message Authentication Code (**HMAC-SHA256**) by hashing the JSON payload combined with a fresh timestamp string using the Secret Key. Place this signature directly into custom headers (X-Agent-Signature, X-Agent-Timestamp), allowing the backend to immediately identify and verify the source before touching any business logic or databases.
