So the UX should **not feel like a DevOps panel**.
It should feel like:

> “Your website is healthy, protected, and watched by real humans.”

That changes everything about the dashboard.

---

# Core UX Philosophy

Your dashboard should optimize for:

1. **Reassurance**
2. **Clarity**
3. **Fast scanning**
4. **Low cognitive load**
5. **Poor internet resilience**
6. **Mobile-first operational usage**

Most hosting dashboards fail because they expose infrastructure terminology directly.

Your users do not care about:

- IOPS
- hypervisors
- worker threads
- load averages

They care about:

- “Is my shop online?”
- “Are customers able to buy?”
- “Is traffic high?”
- “Should I worry?”
- “Can I contact support quickly?”

---

# Primary UX Direction

You should design the dashboard more like:

- Stripe
- Vercel
- Shopify
- Cloudflare simplified pages

NOT like:

- cPanel
- DirectAdmin
- Grafana
- Hetzner
- raw VPS panels

---

# Information Architecture

For non-technical users, the dashboard should only have 4–6 main sections.

## Recommended Sidebar Structure

### 1. Overview

Main reassurance page.

### 2. Websites

List of websites/domains.

### 3. Performance

Simplified charts and health analytics.

### 4. Incidents & Alerts

Problems, resolved incidents, warnings.

### 5. Backups

Backup visibility + restore request.

### 6. Support

Direct support contact + emergency call.

---

# MOST IMPORTANT UX DECISION

Do NOT expose raw server metrics as the primary content.

Instead:

| Technical Metric    | User-Facing UX          |
| ------------------- | ----------------------- |
| CPU spike           | High traffic detected   |
| Load average        | Server under pressure   |
| RAM usage           | Resource usage elevated |
| Concurrent requests | Traffic load state      |
| Bandwidth           | Traffic activity        |
| Downtime            | Store unavailable       |
| Disk usage          | Storage nearly full     |

Technical metrics should exist only in:

- expandable sections
- advanced mode
- admin view

---

# Dashboard Home UX

The Overview page is the most important screen.

It should answer in under 3 seconds:

- Is my store healthy?
- Is there a problem?
- Is support monitoring things?
- Is traffic good?
- What requires my attention?

---

# Recommended Layout

## Top Section → “Status Hero”

Very large simplified health card.

Example:

```txt
Your Store Is Healthy
All monitoring systems operational
Last checked: 20 seconds ago
```

OR:

```txt
High Traffic Detected
Your store is receiving unusual traffic.
Our monitoring team is watching the server.
```

This section is your brand identity.

---

# Health Status Design

Use only 4 states.

| State      | Meaning           |
| ---------- | ----------------- |
| Healthy    | Everything normal |
| Monitoring | Elevated usage    |
| Warning    | Potential issue   |
| Critical   | Action required   |

Avoid:

- too many badge colors
- too many statuses
- complicated indicators

---

# Main Overview Widgets

## 1. Website Availability

Most important metric.

Simple uptime indicator:

```txt
99.98% uptime this month
```

With:

- green pulse
- small history sparkline

---

## 2. Traffic Load

Instead of:

- concurrent workers
- active connections

Show:

```txt
Traffic load: Normal
```

This feels business-oriented.

---

## 3. Traffic Activity

Instead of upload/download charts:

```txt
Traffic Activity
Normal / High / Very High
```

Expandable for advanced details.

---

## 4. Resource Usage

For non-technical users:

```txt
Server Resources
Normal
```

Expandable drawer reveals:

- RAM
- CPU
- Load
- Bandwidth

This keeps UI clean.

---

# UX for Load Average

“Load average” is terrifying and meaningless for normal users.

Never expose:

- Load Average
- System Load
- Linux Load

Instead use:

| Raw Metric     | UX Label            |
| -------------- | ------------------- |
| Load Average   | Server Pressure     |
| CPU Saturation | Processing Activity |
| Worker Queue   | Traffic Queue       |

---

# Recommended Real-Time UX

Since your architecture uses:

- WebSocket live ticks
- REST historical data

You should separate UI updates carefully.

---

# IMPORTANT: Avoid Constantly Moving UI

Bad hosting dashboards:

- numbers constantly changing
- charts animating every second
- stressful interface

For non-technical users:

- smooth updates every 5–10 seconds
- subtle transitions
- calm experience

The UI should feel:

- stable
- trustworthy
- controlled

NOT like stock trading software.

---

# Persian + English UX

This is extremely important.

## Recommendation

Use:

- fully mirrored RTL/LTR layouts
- not just translated text

Your spacing system must support:

- Persian numerals
- mixed English domains
- variable font widths

---

# Typography Recommendation

For Persian:

- Vazirmatn
- Estedad

For English:

- Inter

---

# Important RTL UX Issue

Metrics should NEVER fully mirror.

Example:

GOOD:

```txt
۸۲٪ RAM
```

BAD:
mirrored charts or reversed graphs.

Charts should always preserve:

- left-to-right time progression

even in RTL mode.

This is critical.

---

# Dark Mode UX

Hosting dashboards are frequently used:

- at night
- during emergencies
- on mobile

Dark mode should probably become default.

But:

- avoid pure black
- avoid neon colors
- avoid cyberpunk styling

Use:

- soft contrast
- calm neutral surfaces

Think:

- Linear
- Vercel
- Raycast

---

# Iranian Internet UX Considerations

This is one of the most important parts.

Your dashboard must gracefully degrade.

---

# Recommended Offline UX

## 1. Last Known Data Cache

If WebSocket disconnects:

DO NOT blank the UI.

Show:

```txt
Connection unstable
Showing latest available data
```

Keep cached values visible.

---

## 2. Lightweight Initial Render

Avoid:

- giant chart libraries initially
- hydration-heavy dashboard
- massive animation bundles

Your users may have:

- packet loss
- slow VPN
- unstable mobile internet

---

# Skeleton Loading Strategy

Avoid spinners.

Use:

- persistent skeletons
- reserved layout space

This prevents layout jumps on weak connections.

---

# Charts UX

Non-technical users do not understand complex observability charts.

You should use:

- simplified area charts
- 24h / 7d presets
- minimal axis labels

Avoid:

- dense gridlines
- technical legends
- multiple overlapping datasets

---

# Incident UX

Very important for trust.

Instead of:

```txt
502 upstream timeout
```

Use:

```txt
Temporary slowdown detected
Our team is investigating
```

And provide:

- timestamp
- resolution progress
- support CTA

---

# Support UX

This is your competitive advantage.

You said:

> on-call answering

So support should be visible everywhere.

---

# Recommended Floating Support CTA

Persistent floating action button:

```txt
Need help?
24/7 Support
```

Options:

- call
- WhatsApp
- ticket
- Telegram

---

# CRITICAL TRUST UX

Users should constantly feel:

> “Humans are watching my server.”

This matters more than metrics.

---

# Recommended “Monitoring Team” UX

Example small section:

```txt
Monitoring Status
Our team is actively monitoring your infrastructure 24/7
```

This creates emotional reassurance.

---

# Suggested Overview Page Structure

```txt
------------------------------------------------
Header
------------------------------------------------

Health Hero Section

Quick Stats Row
- Uptime
- Visitors
- Traffic
- Resource Status

Traffic Overview Chart

Recent Alerts

Monitoring Team Status

Support CTA

------------------------------------------------
```

---

# Mobile UX

Very important.

Many Iranian store owners will use mobile only.

Priorities:

- stacked cards
- bottom sheet details
- simplified navigation
- sticky support button

Avoid:

- dense tables
- multi-column analytics
- tiny charts

---

# Performance UX

Since your backend is event-driven and real-time:

You should prioritize:

- optimistic perceived performance
- local cache persistence
- partial updates

Use:

- TanStack Query cache hydration
- WebSocket incremental updates
- shallow rerenders

Your architecture already supports excellent UX.

---

# Recommended Visual Style

## Design Keywords

- Calm
- Modern
- Minimal
- Reassuring
- Professional
- Human
- Stable

NOT:

- Hacker
- Terminal
- Futuristic cyberpanel
- Infrastructure-heavy

---

# Suggested Dashboard Tone

Instead of:

- “CPU threshold exceeded”

Use:

- “Your website is experiencing increased activity.”

---

# Final UX Recommendation

Your biggest opportunity is:

## Build a hosting dashboard that feels like Shopify support + Cloudflare simplicity.

Most Iranian hosting panels:

- overwhelm users
- expose technical jargon
- create anxiety

You can win by making users feel:

- safe
- monitored
- supported
- informed without confusion

That UX positioning is extremely valuable for WooCommerce businesses.
