# WebSocket Client Wrapper — Design Spec

**Issue:** #105
**Repo:** Alteriom/webhook-client
**Date:** 2026-03-28

## Goal

Add a `WebSocketClient` class to `@alteriom/webhook-client` that wraps the connector's Socket.IO server, handling auth, subscription filtering, auto-resubscribe on reconnect, and typed event payloads.

## Server Contract

The webhook connector runs a Socket.IO 4.8.1 server at path `/ws`.

**Auth:** API key via `socket.handshake.auth.apiKey` (or `x-api-key` header fallback). Validated against database. Connection rejected with `"Authentication failed"` on invalid key.

**Connection limit:** 10 concurrent connections per API key (configurable via `MAX_WS_CONNECTIONS_PER_KEY`).

**Server-to-client events:**

| Event | Payload | When |
|---|---|---|
| `connected` | `{ message: string, clientId: string }` | After auth success |
| `webhook-event` | `WebhookEventPayload` (see below) | For each matching webhook |
| `subscribed` | `{ events: string[], repos: string[] }` | After client sends `subscribe` |

**Client-to-server events:**

| Event | Payload | Effect |
|---|---|---|
| `subscribe` | `{ events?: string[], repos?: string[] }` | Update subscription filters |

**Subscription defaults:** `events: ['*']`, `repos: ['*']` (all events, all repos).

**Critical behavior:** Subscription state is lost on reconnect. Server resets to `['*']` for both. Client must re-emit `subscribe` after every reconnect.

**Filter patterns:**
- Event types: `push`, `pull_request`, `workflow_run.completed` (compound supported)
- Repo patterns: `Alteriom/*` (org wildcard), `Alteriom/specific-repo` (exact), `*` (all)
- Both must match (AND logic)

## Types

### `WebhookEventPayload`

```typescript
export interface WebhookEventPayload {
  event: string;
  action?: string;
  delivery_id: string;
  repository?: string;
  sender?: string;
  installation_id?: number;
  summary: string;
  payload: Record<string, unknown>;
  received_at: string;
  dispatched_at: string;
}
```

### `WebSocketClientConfig`

```typescript
export interface WebSocketClientConfig {
  /** Webhook connector base URL (e.g. https://webhook.alteriom.net) */
  url: string;
  /** API key for authentication */
  apiKey: string;
  /** Client name sent to server (defaults to 'webhook-client') */
  name?: string;
  /** Event type filters (defaults to ['*']). Supports compound: 'pull_request.opened' */
  events?: string[];
  /** Repository filters (defaults to ['*']). Supports globs: 'Alteriom/*' */
  repos?: string[];
  /** Enable auto-reconnect (default: true) */
  reconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default: 10000) */
  reconnectDelayMax?: number;
  /** Optional logger */
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };
}
```

### `WebSocketEventMap`

```typescript
export type WebSocketEventMap = {
  event: (payload: WebhookEventPayload) => void;
  connected: (data: { clientId: string }) => void;
  disconnected: (reason: string) => void;
  subscribed: (filters: { events: string[]; repos: string[] }) => void;
  error: (err: Error) => void;
};
```

## `WebSocketClient` Class

### Constructor

```typescript
constructor(config: WebSocketClientConfig)
```

Stores config. Does not connect — connection is explicit via `connect()`.

### `connect(): void`

1. Creates Socket.IO client via `io(config.url, { path: '/ws', auth: { apiKey, name }, reconnection, reconnectionDelay, reconnectionDelayMax })`
2. Registers internal handlers:
   - `connected` → emits `connected` to listeners, then emits `subscribe` with configured `events` and `repos`
   - `webhook-event` → emits `event` to listeners with typed payload
   - `subscribed` → emits `subscribed` to listeners
   - `disconnect` → emits `disconnected` to listeners
   - `connect_error` → emits `error` to listeners
   - `connect` (reconnect) → re-emits `subscribe` with configured filters (auto-resubscribe)

The `subscribe` emit happens on both initial connect (`connected` event) and reconnects (`connect` event) to handle the server's state loss on reconnect.

### `on<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this`

Registers a typed event handler. Returns `this` for chaining.

### `off<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this`

Removes a previously registered handler.

### `disconnect(): void`

Calls `socket.disconnect()`, sets socket to null.

### `get connected(): boolean`

Returns `socket?.connected ?? false`.

### `updateSubscription(filters: { events?: string[]; repos?: string[] }): void`

Updates the stored config filters and emits `subscribe` to the server if currently connected. Allows changing filters without reconnecting.

## File Structure

| File | Responsibility |
|---|---|
| `src/ws-types.ts` | `WebSocketClientConfig`, `WebhookEventPayload`, `WebSocketEventMap` |
| `src/ws-client.ts` | `WebSocketClient` class |
| `src/index.ts` | Re-export `WebSocketClient` and all ws types |
| `tests/ws-client.test.ts` | Unit tests with mocked socket.io-client |

Types are in a separate file from `types.ts` because they depend on Socket.IO concepts and should not pollute the REST-only type surface.

## Package Changes

**`package.json`:**

```json
{
  "peerDependencies": {
    "socket.io-client": ">=4.0.0"
  },
  "peerDependenciesMeta": {
    "socket.io-client": {
      "optional": true
    }
  }
}
```

`socket.io-client` is an optional peer dependency. Consumers who only use the REST client don't need it installed.

**`devDependencies`:** Add `socket.io-client` for testing.

## Usage Example

```typescript
import { WebSocketClient } from '@alteriom/webhook-client';

const ws = new WebSocketClient({
  url: 'https://webhook.alteriom.net',
  apiKey: process.env.WEBHOOK_API_KEY!,
  events: ['workflow_run', 'pull_request'],
  repos: ['Alteriom/*', 'North-Relay/*'],
});

ws.on('event', (event) => {
  console.log(`${event.event}/${event.action} on ${event.repository}`);
  console.log('Summary:', event.summary);
});

ws.on('connected', ({ clientId }) => {
  console.log('Connected as', clientId);
});

ws.on('disconnected', (reason) => {
  console.log('Disconnected:', reason);
});

ws.on('error', (err) => {
  console.error('Connection error:', err.message);
});

ws.connect();

// Later: change subscription without reconnecting
ws.updateSubscription({ events: ['workflow_run.completed'] });

// Clean shutdown
ws.disconnect();
```

## Tests

Mock `socket.io-client`'s `io()` function to return a fake socket with `on`, `emit`, `disconnect`, `connected`.

**Test cases:**

1. `connect()` calls `io()` with correct URL, path `/ws`, auth object
2. `connected` event triggers `subscribe` emit with configured filters
3. Reconnect (`connect` event after disconnect) re-emits `subscribe`
4. `webhook-event` from server calls registered `event` handlers with typed payload
5. `subscribed` from server calls registered `subscribed` handlers
6. `disconnect` from server calls registered `disconnected` handlers
7. `connect_error` from server calls registered `error` handlers
8. `off()` removes handler — handler no longer called
9. `disconnect()` calls `socket.disconnect()` and sets `connected` to false
10. `updateSubscription()` emits `subscribe` to server and updates stored config
11. `updateSubscription()` when not connected stores filters for next connect
12. Multiple handlers on same event all called
13. Chaining: `ws.on('event', h1).on('connected', h2)` works

## Version

This ships as part of `@alteriom/webhook-client` v1.1.0 (minor version — additive, no breaking changes).

## Out of Scope

- Python Socket.IO client (#101 — separate spec)
- MCP server (separate spec)
- Server-side changes (server contract is stable)
- SSE or alternative transport support
