# Next.js Monitoring Socket Guide

This guide is for a Next.js App Router client that needs to show the protected monitoring dashboard.

## Auth Flow

The monitoring page requires two tokens:

- `accessToken`: normal user access token from login or OTP login.
- `monitoringAccessToken`: short-lived token returned after monitoring OTP verification.

Request monitoring access:

```ts
await fetch(`${API_URL}/v1/auth/otp/monitoring-access/request`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    phoneNumber,
    context: 'MONITORING_ACCESS',
  }),
});
```

Verify the OTP:

```ts
const res = await fetch(`${API_URL}/v1/auth/otp/monitoring-access/verify`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  },
  body: JSON.stringify({
    phoneNumber,
    otp,
    context: 'MONITORING_ACCESS',
  }),
});

const { data } = await res.json();
const monitoringAccessToken = data.monitoringAccessToken;
```

## Initial REST Fetch

Use REST first to load the complete monitoring state. This endpoint returns website details, latest metrics, 24-hour samples, SSL, alerts, VPS, and server data.

```ts
const res = await fetch(`${API_URL}/v1/dashboard/monitoring`, {
  headers: {
    Authorization: `Bearer ${accessToken}`,
    'Monitoring-Access-Token': `Bearer ${monitoringAccessToken}`,
  },
  cache: 'no-store',
});

const monitoring = await res.json();
```

In App Router, keep tokens server-side when possible. If the socket must run in a client component, expose only the tokens needed for that session and clear `monitoringAccessToken` when the user leaves monitoring mode.

## Socket Connection

Install the client:

```bash
npm install socket.io-client
```

Connect from a client component:

```tsx
'use client';

import { useEffect } from 'react';
import { io } from 'socket.io-client';

export function MonitoringSocket({
  accessToken,
  monitoringAccessToken,
  onWebsiteTick,
  onVpsTick,
}: {
  accessToken: string;
  monitoringAccessToken: string;
  onWebsiteTick: (payload: unknown) => void;
  onVpsTick: (payload: unknown) => void;
}) {
  useEffect(() => {
    const socket = io(`${API_URL}/realtime`, {
      transports: ['websocket'],
      auth: {
        token: accessToken,
        monitoringAccessToken,
      },
    });

    socket.on('monitoring:website_tick', onWebsiteTick);
    socket.on('monitoring:vps_tick', onVpsTick);

    socket.on('connect_error', () => {
      // Re-request monitoring OTP if the monitoring access token expired.
    });

    return () => {
      socket.disconnect();
    };
  }, [accessToken, monitoringAccessToken, onWebsiteTick, onVpsTick]);

  return null;
}
```

## Live Events

`monitoring:website_tick`

```ts
{
  vpsNodeId: string;
  websiteId: string;
  domain: string;
  timestamp: string;
  traffic: {
    load: 'idle' | 'normal' | 'busy' | 'high' | 'critical' | 'unknown';
    activity: 'idle' | 'normal' | 'busy' | 'high' | 'critical' | 'unknown';
  }
}
```

Use this to patch the matching website from the REST response by `websiteId`.

`monitoring:vps_tick`

```ts
{
  vpsNodeId: string;
  timestamp: string;
  metrics: {
    cpuUsagePercent: number;
    memoryUsedMB: number;
    memoryTotalMB: number;
    liteSpeedConnections: number;
    diskReadBytesPerSecond: number;
    diskWriteBytesPerSecond: number;
    diskIops: number;
    storageTotalMB: number;
    storageAvailableMB: number;
  }
}
```

Use this to patch every website whose `infrastructure.vpsNode.id` matches `vpsNodeId`.

## Recommended Page Pattern

1. User enters monitoring area.
2. Request monitoring OTP.
3. Verify OTP and store `monitoringAccessToken` for the session.
4. Fetch `/v1/dashboard/monitoring` for initial state.
5. Connect Socket.IO to `/realtime`.
6. Patch local state from `monitoring:website_tick` and `monitoring:vps_tick`.
7. Disconnect the socket on route change or component unmount.
