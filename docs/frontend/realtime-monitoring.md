# Next.js Realtime Monitoring

The monitoring page connects to the Socket.IO `/realtime` namespace. A socket
is authorized only when it provides both:

- The user's normal access token.
- The short-lived monitoring access token obtained through the monitoring
  access authentication flow.

The backend validates both tokens during connection, revalidates them every 30
seconds, and disconnects the socket when either token or the user's session is
no longer valid.

## Connect From a Client Component

Install the Socket.IO client:

```bash
npm install socket.io-client
```

Create the socket only in browser-side code. Pass tokens through Socket.IO's
`auth` object; custom WebSocket headers are not reliable in browsers.

```ts
'use client';

import { io, type Socket } from 'socket.io-client';

export function connectMonitoringSocket({
  apiUrl,
  accessToken,
  monitoringAccessToken,
}: {
  apiUrl: string;
  accessToken: string;
  monitoringAccessToken: string;
}): Socket {
  return io(`${apiUrl}/realtime`, {
    auth: {
      token: accessToken,
      monitoringAccessToken,
    },
    transports: ['websocket'],
  });
}
```

Do not connect until both tokens are available.

## Monitoring Events

Listen for these events:

```ts
socket.on('monitoring:snapshot', ({ nodes, websites, generatedAt }) => {
  // Replace the current monitoring state.
});

socket.on('monitoring:vps_tick', (node) => {
  // Upsert the node using node.id.
});

socket.on('monitoring:website_tick', (website) => {
  // Upsert the website using website.id.
});

socket.on('incident.created', (incident) => {
  // Add or display the new incident.
});

socket.on('incident.resolved', ({ websiteId, alertId }) => {
  // Mark or remove the resolved incident.
});
```

`monitoring:snapshot` is emitted once after a successful connection and
contains the latest authorized node and website state. Subsequent tick events
should update individual records instead of replacing the entire state.

## Token Expiration And Reconnection

The monitoring access token may expire after 5 or 15 minutes. When the server
disconnects the socket, obtain a new monitoring access token through the normal
monitoring access flow before reconnecting.

```ts
socket.on('disconnect', async (reason) => {
  if (reason !== 'io server disconnect') return;

  const tokens = await refreshRequiredTokens();

  socket.auth = {
    token: tokens.accessToken,
    monitoringAccessToken: tokens.monitoringAccessToken,
  };

  socket.connect();
});
```

Avoid repeatedly reconnecting with expired tokens. If refreshing authentication
fails, stop reconnecting and return the user to the appropriate login or
monitoring-access verification screen.

## Cleanup

Remove listeners and disconnect when the monitoring page provider unmounts:

```ts
return () => {
  socket.removeAllListeners();
  socket.disconnect();
};
```

Keep one socket connection for the monitoring page and share it through a React
provider or store. Do not create a separate socket for every chart or card.
