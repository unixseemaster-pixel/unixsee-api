# Unixsee Dashboard Monitoring Test Plan

**Purpose:** Provide a practical, repeatable testing plan for validating the Unixsee Monitor Agent, NestJS Core Backend, PostgreSQL metric storage, Socket.io live updates, REST chart APIs, and Next.js dashboard UI.

**Audience:** Future developer/operator implementing QA and staging tests.

**Environment:**

- Local machine: Windows 11
- Servers: Ubuntu VPS
- Websites: WordPress/WooCommerce and custom apps
- Agent: Unixsee Monitor Agent running on each monitored VPS
- Backend: Unixsee Core API / NestJS
- Dashboard: Next.js client dashboard

---

## 1. Core Testing Principles

1. Do not test everything by sending many requests to a WordPress website.
2. Test each metric through its real source.
3. Use controlled, short, low-risk tests first.
4. Verify the full data path, not only the UI.
5. Treat request activity as **request pressure**, not **live visitors**, unless real visitor/session tracking is implemented.
6. Use REST for historical/charts and Socket.io only for live volatile ticks.
7. Never run destructive stress tests on production customer websites.

---

## 2. Metric Source Map

| Dashboard item               | Real source                           | Correct test method             | Notes                                 |
| ---------------------------- | ------------------------------------- | ------------------------------- | ------------------------------------- |
| CPU usage                    | Agent reads `/proc/stat`              | `stress-ng --cpu` on Ubuntu     | Do not test by website spam.          |
| RAM usage                    | Agent reads `/proc/meminfo`           | `stress-ng --vm` on Ubuntu      | Use safe memory sizes.                |
| Disk I/O                     | Agent reads `/proc/diskstats`         | `fio` on Ubuntu                 | Run in `/tmp`, not DB/site folders.   |
| Storage usage                | Agent uses filesystem capacity        | temporary `fallocate` file      | Clean up after test.                  |
| LiteSpeed connections        | Agent reads `/tmp/lshttpd/.rtreport*` | light HTTP requests             | Requires rtreport to exist.           |
| Website request pressure     | Agent maps LiteSpeed vhost report     | low `autocannon` / `k6`         | Not real visitors.                    |
| Website response time / TTFB | Core backend public uptime probe      | backend probe + DB check        | Requires Core DNS/outbound HTTPS.     |
| Charts                       | Backend REST chart endpoints          | DB rows + REST response         | Do not rely on Socket.io for history. |
| Live ticks                   | Socket.io                             | browser DevTools + backend logs | Only latest volatile state.           |

---

## 3. Tooling Setup

### 3.1 Windows 11 local machine

Install HTTP testing tools:

```powershell
winget install Grafana.k6
npm install -g autocannon
```

Verify:

```powershell
k6 version
autocannon --version
curl.exe -I https://your-test-site.com/
```

Use Windows mainly for external HTTP tests against websites and API endpoints.

### 3.2 Monitored Ubuntu VPS

Install system testing tools:

```bash
sudo apt update
sudo apt install -y stress-ng fio sysstat htop btop curl
```

Check agent:

```bash
pm2 status
pm2 logs unixsee-monitor-agent --lines 100
```

Check LiteSpeed real-time report:

```bash
ls -lah /tmp/lshttpd/.rtreport /tmp/lshttpd/.rtreport.2 2>/dev/null
```

If both files are missing, LiteSpeed request-pressure metrics will stay empty or zero.

### 3.3 Core Backend Ubuntu VPS

Check backend:

```bash
pm2 status
pm2 logs unixsee-api --lines 100
```

Check DB access:

```bash
psql "$DATABASE_URL" -c "select now();"
```

---

## 4. Baseline Before Any Test

Before running stress or request tests, capture current DB state.

```bash
psql "$DATABASE_URL" <<'SQL'
select recorded_at, cpu_usage_percent, memory_used_mb, memory_total_mb,
       litespeed_connections, disk_read_bytes_per_second,
       disk_write_bytes_per_second, disk_iops,
       storage_total_mb, storage_available_mb
from vps_metrics
order by recorded_at desc
limit 10;

select wm.recorded_at, w.domain, wm.concurrent_requests, wm.request_rate
from web_metrics wm
join websites w on w.id = wm.website_id
order by wm.recorded_at desc
limit 20;

select w.domain, wpm.recorded_at, wpm.probe_source, wpm.is_up,
       wpm.status_code, wpm.response_time_ms, wpm.ttfb_ms, wpm.error_message
from website_probe_metrics wpm
join websites w on w.id = wpm.website_id
order by wpm.recorded_at desc
limit 20;
SQL
```

Expected:

- Recent `vps_metrics` rows exist.
- Recent `web_metrics` rows exist for discovered websites.
- `website_probe_metrics` has `BACKEND` rows only after backend public probes are working.

---

## 5. Agent Heartbeat and Backend Ingestion Test

### Goal

Confirm the agent pushes data and backend stores it.

### Steps

On monitored VPS:

```bash
pm2 restart unixsee-monitor-agent --update-env
pm2 logs unixsee-monitor-agent --lines 100
```

Wait 90 seconds.

On Core API VPS:

```bash
pm2 logs unixsee-api --lines 100
```

Expected backend logs:

```txt
Agent ingest received
Agent ingest stored
vpsInserted=1
webInserted=...
```

DB validation:

```bash
psql "$DATABASE_URL" -c "
select recorded_at, cpu_usage_percent, memory_used_mb, litespeed_connections
from vps_metrics
order by recorded_at desc
limit 5;
"
```

Pass condition:

- A new `vps_metrics` row appears about every 60 seconds.

---

## 6. CPU Test

### Goal

Confirm CPU usage rises from VPS reality to dashboard.

### Run on monitored VPS

```bash
stress-ng --cpu 2 --timeout 150s --metrics-brief
```

Watch reality:

```bash
htop
```

Wait 60–90 seconds, then validate DB:

```bash
psql "$DATABASE_URL" -c "
select recorded_at, cpu_usage_percent
from vps_metrics
order by recorded_at desc
limit 10;
"
```

Expected:

- `cpu_usage_percent` increases during test.
- Dashboard CPU chart/card changes within 1–2 ingest cycles.

Pass condition:

- CPU spike visible in DB and dashboard.

---

## 7. RAM Test

### Goal

Confirm memory usage changes are collected and displayed.

### Safe test

```bash
stress-ng --vm 1 --vm-bytes 512M --timeout 150s --metrics-brief
```

For bigger VPS only:

```bash
stress-ng --vm 1 --vm-bytes 20% --timeout 150s --metrics-brief
```

Validate:

```bash
psql "$DATABASE_URL" -c "
select recorded_at, memory_used_mb, memory_total_mb
from vps_metrics
order by recorded_at desc
limit 10;
"
```

Expected:

- `memory_used_mb` rises during test.
- Memory usage drops after test finishes.

Pass condition:

- RAM chart/card follows the stress window.

---

## 8. Disk I/O Test

### Goal

Confirm disk read/write and IOPS metrics are detected.

### Run safely in `/tmp`

```bash
mkdir -p /tmp/unixsee-fio-test

fio --name=unixsee-disk-test \
  --directory=/tmp/unixsee-fio-test \
  --size=512M \
  --rw=randrw \
  --bs=4k \
  --iodepth=16 \
  --runtime=150 \
  --time_based \
  --group_reporting
```

Validate:

```bash
psql "$DATABASE_URL" -c "
select recorded_at, disk_read_bytes_per_second,
       disk_write_bytes_per_second, disk_iops
from vps_metrics
order by recorded_at desc
limit 10;
"
```

Cleanup:

```bash
rm -rf /tmp/unixsee-fio-test
```

Expected:

- Disk write/read bytes or IOPS rise during test.

Notes:

- First disk sample may be zero because the agent calculates deltas from the previous `/proc/diskstats` tick.

---

## 9. Storage Usage Test

### Goal

Confirm available storage changes are detected.

### Run on monitored VPS

```bash
df -h /
fallocate -l 1G /tmp/unixsee-storage-test.bin
```

Wait 60–90 seconds.

Validate:

```bash
psql "$DATABASE_URL" -c "
select recorded_at, storage_total_mb, storage_available_mb
from vps_metrics
order by recorded_at desc
limit 10;
"
```

Cleanup:

```bash
rm -f /tmp/unixsee-storage-test.bin
```

Expected:

- `storage_available_mb` decreases by about 1024 MB during test.
- It recovers after cleanup.

---

## 10. Website Request Pressure Test

### Goal

Confirm LiteSpeed request pressure changes move through agent/backend/dashboard.

### Safe URLs

Use:

```txt
/
a cached product page
a static page
/api/health for custom apps
```

Avoid:

```txt
/cart
/checkout
/wp-admin
/wp-login.php
?add-to-cart=
uncached filters/search pages
```

### Run from Windows 11

Small test:

```powershell
autocannon -c 2 -d 60 https://your-test-site.com/
```

Slightly stronger:

```powershell
autocannon -c 5 -d 60 https://your-test-site.com/
```

Validate:

```bash
psql "$DATABASE_URL" -c "
select wm.recorded_at, w.domain, wm.concurrent_requests, wm.request_rate
from web_metrics wm
join websites w on w.id = wm.website_id
where w.domain = 'your-test-site.com'
order by wm.recorded_at desc
limit 20;
"
```

Expected:

- `concurrent_requests` or `request_rate` changes if OpenLiteSpeed/LiteSpeed `.rtreport` maps the vhost correctly.

Important wording:

- Call this **request pressure**, **request activity**, or **traffic pressure**.
- Do not call it **live visitors** unless real visitor/session tracking is implemented.

---

## 11. Backend Public Uptime / Response-Time Probe Test

### Goal

Confirm backend public probes create response time and TTFB metrics.

### Precondition

Core backend VPS must be able to resolve and reach domains:

```bash
getent hosts maxbax.com
curl -4Iv --connect-timeout 5 --max-time 8 https://maxbax.com/
```

If DNS is broken, backend uptime probe will correctly report DNS failure.

### Temporary `/etc/hosts` workaround for test only

```bash
sudo nano /etc/hosts
```

Add:

```txt
REAL_IP_HERE maxbax.com
```

Then:

```bash
getent hosts maxbax.com
curl -4Iv --connect-timeout 5 --max-time 8 https://maxbax.com/
pm2 restart unixsee-api --update-env
pm2 logs unixsee-api --lines 100
```

Validate:

```bash
psql "$DATABASE_URL" -c "
select w.domain, wpm.recorded_at, wpm.probe_source, wpm.is_up,
       wpm.status_code, wpm.response_time_ms, wpm.ttfb_ms, wpm.error_message
from website_probe_metrics wpm
join websites w on w.id = wpm.website_id
where wpm.probe_source = 'BACKEND'
order by wpm.recorded_at desc
limit 20;
"
```

Expected:

- `probe_source = BACKEND`
- `is_up = true`
- `status_code` is valid for the website, usually `200`, `301`, `302`, or `403` depending on config.
- `response_time_ms` has a value.
- `ttfb_ms` has a value if implemented.

---

## 12. REST Chart API Test

### Goal

Confirm chart APIs use stored DB history and do not rely on Socket.io.

### Validate REST response

Call the charts endpoint with a valid token:

```bash
curl -s "https://core.unixsee.com/v1/dashboard/overview/charts?range=24h" \
  -H "Authorization: Bearer TOKEN_HERE" | jq .
```

Expected:

- `generatedAt` exists.
- `range` exists.
- `vpsNodes[].resources[]` contains CPU/RAM/storage data.
- `websites[].traffic[]` contains request pressure data.
- `websites[].performance[]` contains response/TTFB/uptime only if `BACKEND` probe rows exist.

Pass condition:

- Chart points match DB values for the same range.

---

## 13. Socket.io Live Dashboard Test

### Goal

Confirm live ticks arrive without replacing REST chart history.

### Browser validation

Open dashboard, then:

```txt
Chrome DevTools → Network → WS → socket.io connection
```

Expected backend logs:

```txt
RealtimeGateway User connected
Agent ingest stored
Socket tick/update emitted
```

Expected UI:

- Live cards update after agent ingest.
- Charts stay based on REST data.
- Reconnecting/disconnected states are clear.
- Socket unsubscribes on navigation.

---

## 14. Status and Enum Test Cases

### 14.1 Healthy state

Required:

- Latest `vps_metrics` exists.
- Latest `web_metrics` exists.
- Latest `BACKEND` website probe is up.
- No active alerts.

Expected UI:

```txt
سالم
آنلاین
بدون هشدار فعال
```

### 14.2 Waiting/unknown state

Use a website with no probe data.

Expected UI:

```txt
در انتظار داده معتبر
نامشخص
```

Do not show fake healthy/down values.

### 14.3 Down state

Use only a test website.

Options:

1. Point a test domain to a closed port temporarily.
2. Stop only a test app service.
3. Add a fake website row with an unreachable test domain.

Expected DB:

- `website_probe_metrics.is_up = false`
- `error_message` has a useful reason.

Expected UI:

```txt
نیازمند بررسی
قطع / دردسترس نیست
```

---

## 15. WordPress-Specific Rules

Safe endpoints:

```txt
homepage
cached category page
cached product page
static page
```

Avoid:

```txt
checkout
cart
login
admin ajax
add to cart
search/filter pages
REST write endpoints
```

Safe request test:

```powershell
autocannon -c 2 -d 60 https://wordpress-test-site.com/
```

Only after basic tests pass:

```powershell
autocannon -c 5 -d 60 https://wordpress-test-site.com/
```

Do not run high concurrency against production WooCommerce sites unless intentionally doing staging load testing.

---

## 16. Custom App Rules

Each custom app should expose a cheap health endpoint:

```txt
/health
/api/health
```

Safe test:

```powershell
autocannon -c 10 -d 60 https://custom-app.com/health
```

Prefer health endpoint testing over dynamic page testing.

---

## 17. Full Pipeline Validation

After each phase, confirm the pipeline:

```txt
Ubuntu reality → Agent collection → Backend ingest → PostgreSQL rows → REST/Socket API → Next.js dashboard UI
```

Use this order:

1. Validate reality on VPS with `htop`, `btop`, `df`, `fio`, or `curl`.
2. Validate agent logs.
3. Validate backend logs.
4. Validate PostgreSQL rows.
5. Validate REST response.
6. Validate Socket.io tick.
7. Validate dashboard UI.

---

## 18. Final Pass/Fail Checklist

The monitoring system passes baseline QA when:

- Agent sends data every about 60 seconds.
- `vps_metrics` rows are created.
- CPU stress changes `cpu_usage_percent`.
- RAM stress changes `memory_used_mb`.
- Disk I/O stress changes disk I/O fields.
- Storage file test changes `storage_available_mb`.
- Light website requests change `web_metrics.concurrent_requests` or `request_rate` when LiteSpeed mapping works.
- Backend probe creates `website_probe_metrics` rows with `probeSource = BACKEND`.
- REST overview and chart endpoints show correct latest and historical data.
- Socket.io sends live ticks after ingest.
- Dashboard does not call request pressure “live visitors”.
- Empty/unavailable metrics are shown honestly.
- WordPress tests avoid checkout, cart, login, admin, and write endpoints.

---

## 19. Implementation Backlog

### Must implement before formal QA

- Add a `scripts/testing/` folder to the operations repo.
- Add reusable SQL files:
  - `baseline-vps-metrics.sql`
  - `baseline-web-metrics.sql`
  - `baseline-probe-metrics.sql`
- Add Windows test scripts:
  - `test-site-low.ps1`
  - `test-api-health.ps1`
- Add Ubuntu test scripts:
  - `test-cpu.sh`
  - `test-ram.sh`
  - `test-disk-io.sh`
  - `test-storage.sh`
- Add a QA checklist template for each monitored VPS.

### Should implement later

- Dedicated staging WordPress site for load tests.
- Dedicated staging custom app with `/health` endpoint.
- External probe worker on a clean VPS with reliable DNS.
- Prometheus/node-exporter comparison environment for independent truth.
- Automated weekly synthetic QA run on staging.

---

## 20. Notes for Future Developers

- Keep testing low-risk and source-specific.
- Do not use large request floods to validate CPU/RAM.
- Do not use Socket.io for chart history.
- Do not display fake values for missing data.
- Do not rename request pressure as live visitors.
- Keep website-owner dashboard language simple and high-signal.
