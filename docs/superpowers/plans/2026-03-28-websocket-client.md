# WebSocket Client Wrapper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `WebSocketClient` class to `@alteriom/webhook-client` that wraps the connector's Socket.IO server with typed events, auto-resubscribe on reconnect, and configurable filtering.

**Architecture:** A thin wrapper around `socket.io-client` that handles auth, subscription management, and lifecycle events. Types in a separate file from the REST types. `socket.io-client` as an optional peer dependency so REST-only consumers aren't affected.

**Tech Stack:** TypeScript, socket.io-client (peer dep), Jest (mocked socket)

---

## File Structure

| File | Responsibility |
|---|---|
| `src/ws-types.ts` | Type definitions: `WebhookEventPayload`, `WebSocketClientConfig`, `WebSocketEventMap` |
| `src/ws-client.ts` | `WebSocketClient` class: connect, auth, subscribe, auto-resubscribe, lifecycle |
| `src/index.ts` | Add re-exports for `WebSocketClient` and ws types |
| `tests/ws-client.test.ts` | Unit tests with mocked socket.io-client |
| `package.json` | Add `socket.io-client` peer dep + dev dep |
| `README.md` | Add WebSocket usage section |
| `CHANGELOG.md` | Add v1.1.0 entry |

---

### Task 1: Define WebSocket types

**Files:**
- Create: `src/ws-types.ts`
- Test: `tests/ws-client.test.ts` (type-level verification)

- [ ] **Step 1: Create ws-types.ts with all type definitions**

```typescript
// src/ws-types.ts

/**
 * Payload shape for webhook events received via WebSocket.
 * Matches the server's `webhook-event` emission in ws-adapter.ts.
 */
export interface WebhookEventPayload {
  /** GitHub event type (e.g. 'push', 'pull_request') */
  event: string;
  /** Event action (e.g. 'opened', 'closed') — absent for events like 'push' */
  action?: string;
  /** GitHub delivery UUID */
  delivery_id: string;
  /** Full repository name (e.g. 'Alteriom/my-repo') */
  repository?: string;
  /** GitHub login of event actor */
  sender?: string;
  /** GitHub App installation ID */
  installation_id?: number;
  /** Human-readable event summary */
  summary: string;
  /** Full GitHub webhook payload */
  payload: Record<string, unknown>;
  /** ISO timestamp when webhook was received by connector */
  received_at: string;
  /** ISO timestamp when event was dispatched to this client */
  dispatched_at: string;
}

/**
 * Configuration for WebSocketClient.
 */
export interface WebSocketClientConfig {
  /** Webhook connector base URL (e.g. 'https://webhook.alteriom.net') */
  url: string;
  /** API key for authentication */
  apiKey: string;
  /** Client name sent to server (default: 'webhook-client') */
  name?: string;
  /** Event type filters (default: ['*']). Supports compound: 'pull_request.opened' */
  events?: string[];
  /** Repository filters (default: ['*']). Supports globs: 'Alteriom/*' */
  repos?: string[];
  /** Enable auto-reconnect (default: true) */
  reconnect?: boolean;
  /** Initial reconnect delay in ms (default: 1000) */
  reconnectDelay?: number;
  /** Max reconnect delay in ms (default: 10000) */
  reconnectDelayMax?: number;
  /** Optional logger for connection lifecycle events */
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };
}

/**
 * Event handler map for WebSocketClient.on() / .off().
 */
export type WebSocketEventMap = {
  /** Fired for each webhook event matching subscription filters */
  event: (payload: WebhookEventPayload) => void;
  /** Fired after successful authentication */
  connected: (data: { clientId: string }) => void;
  /** Fired when connection is lost */
  disconnected: (reason: string) => void;
  /** Fired when server confirms subscription filters */
  subscribed: (filters: { events: string[]; repos: string[] }) => void;
  /** Fired on connection errors */
  error: (err: Error) => void;
};
```

- [ ] **Step 2: Write a type-level test to verify types compile**

```typescript
// tests/ws-client.test.ts
import type { WebhookEventPayload, WebSocketClientConfig, WebSocketEventMap } from '../src/ws-types';

describe('WebSocket types', () => {
  it('WebhookEventPayload has required fields', () => {
    const payload: WebhookEventPayload = {
      event: 'push',
      delivery_id: 'uuid-123',
      summary: 'Push to main',
      payload: {},
      received_at: '2026-01-01T00:00:00Z',
      dispatched_at: '2026-01-01T00:00:00Z',
    };
    expect(payload.event).toBe('push');
    expect(payload.action).toBeUndefined();
    expect(payload.repository).toBeUndefined();
  });

  it('WebhookEventPayload accepts optional fields', () => {
    const payload: WebhookEventPayload = {
      event: 'pull_request',
      action: 'opened',
      delivery_id: 'uuid-456',
      repository: 'Alteriom/test',
      sender: 'sparck75',
      installation_id: 12345,
      summary: 'PR #1 opened',
      payload: { pull_request: { number: 1 } },
      received_at: '2026-01-01T00:00:00Z',
      dispatched_at: '2026-01-01T00:00:01Z',
    };
    expect(payload.action).toBe('opened');
    expect(payload.repository).toBe('Alteriom/test');
  });

  it('WebSocketClientConfig requires url and apiKey', () => {
    const config: WebSocketClientConfig = {
      url: 'https://webhook.alteriom.net',
      apiKey: 'ak_test',
    };
    expect(config.url).toBeDefined();
    expect(config.events).toBeUndefined();
    expect(config.reconnect).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run tests to verify types compile**

Run: `cd /home/ubuntu/claude/worktrees/webhook-client-ws && npm test -- --testPathPattern=ws-client`
Expected: PASS (3 tests)

- [ ] **Step 4: Commit**

```bash
git add src/ws-types.ts tests/ws-client.test.ts
git commit -m "feat(#105): define WebSocket client types"
```

---

### Task 2: Implement WebSocketClient class

**Files:**
- Create: `src/ws-client.ts`
- Modify: `tests/ws-client.test.ts`

- [ ] **Step 1: Write failing tests for WebSocketClient**

Add to `tests/ws-client.test.ts`:

```typescript
import { WebSocketClient } from '../src/ws-client';
import type { WebhookEventPayload } from '../src/ws-types';

// Mock socket.io-client
const mockSocket = {
  on: jest.fn(),
  emit: jest.fn(),
  disconnect: jest.fn(),
  connected: false,
};

jest.mock('socket.io-client', () => ({
  io: jest.fn(() => mockSocket),
}));

import { io } from 'socket.io-client';

describe('WebSocketClient', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSocket.connected = false;
    mockSocket.on.mockReset();
    mockSocket.emit.mockReset();
    mockSocket.disconnect.mockReset();
  });

  describe('connect()', () => {
    it('calls io() with correct URL, path, and auth', () => {
      const ws = new WebSocketClient({
        url: 'https://webhook.alteriom.net',
        apiKey: 'ak_test',
        name: 'my-agent',
      });

      ws.connect();

      expect(io).toHaveBeenCalledWith('https://webhook.alteriom.net', {
        path: '/ws',
        auth: { apiKey: 'ak_test', name: 'my-agent' },
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      });
    });

    it('uses default name when not provided', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      ws.connect();

      expect(io).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        auth: { apiKey: 'ak_test', name: 'webhook-client' },
      }));
    });

    it('passes custom reconnection config', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        reconnect: false,
        reconnectDelay: 5000,
        reconnectDelayMax: 30000,
      });

      ws.connect();

      expect(io).toHaveBeenCalledWith('https://example.com', expect.objectContaining({
        reconnection: false,
        reconnectionDelay: 5000,
        reconnectionDelayMax: 30000,
      }));
    });
  });

  describe('auto-subscribe on connect', () => {
    it('emits subscribe with configured filters on connected event', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        events: ['workflow_run', 'pull_request'],
        repos: ['Alteriom/*'],
      });

      ws.connect();

      // Find the handler registered for 'connected'
      const connectedHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connected'
      )?.[1];
      expect(connectedHandler).toBeDefined();

      // Simulate server sending 'connected'
      connectedHandler({ message: 'Welcome', clientId: 'sock-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['workflow_run', 'pull_request'],
        repos: ['Alteriom/*'],
      });
    });

    it('defaults to ["*"] for events and repos when not configured', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      ws.connect();

      const connectedHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connected'
      )?.[1];
      connectedHandler({ message: 'Welcome', clientId: 'sock-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['*'],
        repos: ['*'],
      });
    });
  });

  describe('auto-resubscribe on reconnect', () => {
    it('re-emits subscribe on Socket.IO connect event (reconnect)', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        events: ['push'],
        repos: ['North-Relay/*'],
      });

      ws.connect();

      // Find the handler registered for Socket.IO 'connect' (fires on reconnect)
      const connectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect'
      )?.[1];
      expect(connectHandler).toBeDefined();

      // Simulate reconnect
      connectHandler();

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['push'],
        repos: ['North-Relay/*'],
      });
    });
  });

  describe('event forwarding', () => {
    it('forwards webhook-event to registered event handlers', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('event', handler);
      ws.connect();

      // Find the handler for 'webhook-event'
      const webhookHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'webhook-event'
      )?.[1];
      expect(webhookHandler).toBeDefined();

      const testPayload: WebhookEventPayload = {
        event: 'push',
        delivery_id: 'uuid-1',
        repository: 'Alteriom/test',
        sender: 'sparck75',
        summary: 'Push to main',
        payload: {},
        received_at: '2026-01-01T00:00:00Z',
        dispatched_at: '2026-01-01T00:00:01Z',
      };

      webhookHandler(testPayload);

      expect(handler).toHaveBeenCalledWith(testPayload);
    });

    it('forwards connected event to registered handlers', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('connected', handler);
      ws.connect();

      const connectedHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connected'
      )?.[1];
      connectedHandler({ message: 'Welcome', clientId: 'sock-123' });

      expect(handler).toHaveBeenCalledWith({ clientId: 'sock-123' });
    });

    it('forwards disconnect to registered handlers', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('disconnected', handler);
      ws.connect();

      const disconnectHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'disconnect'
      )?.[1];
      disconnectHandler('transport close');

      expect(handler).toHaveBeenCalledWith('transport close');
    });

    it('forwards subscribed event to registered handlers', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('subscribed', handler);
      ws.connect();

      const subscribedHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'subscribed'
      )?.[1];
      subscribedHandler({ events: ['push'], repos: ['*'] });

      expect(handler).toHaveBeenCalledWith({ events: ['push'], repos: ['*'] });
    });

    it('forwards connect_error to error handlers', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('error', handler);
      ws.connect();

      const errorHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connect_error'
      )?.[1];
      const err = new Error('Authentication failed');
      errorHandler(err);

      expect(handler).toHaveBeenCalledWith(err);
    });

    it('calls multiple handlers registered for same event', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler1 = jest.fn();
      const handler2 = jest.fn();
      ws.on('event', handler1);
      ws.on('event', handler2);
      ws.connect();

      const webhookHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'webhook-event'
      )?.[1];
      webhookHandler({ event: 'push', delivery_id: '1', summary: '', payload: {}, received_at: '', dispatched_at: '' });

      expect(handler1).toHaveBeenCalled();
      expect(handler2).toHaveBeenCalled();
    });
  });

  describe('off()', () => {
    it('removes a handler so it is no longer called', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const handler = jest.fn();
      ws.on('event', handler);
      ws.off('event', handler);
      ws.connect();

      const webhookHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'webhook-event'
      )?.[1];
      webhookHandler({ event: 'push', delivery_id: '1', summary: '', payload: {}, received_at: '', dispatched_at: '' });

      expect(handler).not.toHaveBeenCalled();
    });
  });

  describe('disconnect()', () => {
    it('calls socket.disconnect()', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      ws.connect();
      ws.disconnect();

      expect(mockSocket.disconnect).toHaveBeenCalled();
    });
  });

  describe('connected getter', () => {
    it('returns false before connect', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      expect(ws.connected).toBe(false);
    });

    it('returns socket.connected after connect', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      ws.connect();
      mockSocket.connected = true;

      expect(ws.connected).toBe(true);
    });
  });

  describe('updateSubscription()', () => {
    it('emits subscribe with new filters when connected', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        events: ['push'],
        repos: ['*'],
      });

      ws.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      ws.updateSubscription({ events: ['workflow_run.completed'], repos: ['Alteriom/*'] });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['workflow_run.completed'],
        repos: ['Alteriom/*'],
      });
    });

    it('stores filters for next connect when not connected', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        events: ['push'],
      });

      // Update before connecting
      ws.updateSubscription({ events: ['workflow_run'] });

      // Now connect
      ws.connect();

      const connectedHandler = mockSocket.on.mock.calls.find(
        (call: any[]) => call[0] === 'connected'
      )?.[1];
      connectedHandler({ message: 'Welcome', clientId: 'sock-123' });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['workflow_run'],
        repos: ['*'],
      });
    });

    it('partially updates — only overrides provided fields', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
        events: ['push'],
        repos: ['Alteriom/*'],
      });

      ws.connect();
      mockSocket.connected = true;
      mockSocket.emit.mockClear();

      // Only update events, repos should stay
      ws.updateSubscription({ events: ['workflow_run'] });

      expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
        events: ['workflow_run'],
        repos: ['Alteriom/*'],
      });
    });
  });

  describe('on() chaining', () => {
    it('returns this for chaining', () => {
      const ws = new WebSocketClient({
        url: 'https://example.com',
        apiKey: 'ak_test',
      });

      const result = ws.on('event', jest.fn()).on('connected', jest.fn());
      expect(result).toBe(ws);
    });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /home/ubuntu/claude/worktrees/webhook-client-ws && npm test -- --testPathPattern=ws-client`
Expected: FAIL (WebSocketClient module not found)

- [ ] **Step 3: Implement WebSocketClient**

```typescript
// src/ws-client.ts
import { io, Socket } from 'socket.io-client';
import type { WebhookEventPayload, WebSocketClientConfig, WebSocketEventMap } from './ws-types';

/**
 * WebSocket client for real-time webhook event streaming.
 *
 * Wraps the connector's Socket.IO server with typed events,
 * auto-resubscribe on reconnect, and configurable filtering.
 *
 * @example
 * ```typescript
 * const ws = new WebSocketClient({
 *   url: 'https://webhook.alteriom.net',
 *   apiKey: process.env.WEBHOOK_API_KEY!,
 *   events: ['workflow_run', 'pull_request'],
 *   repos: ['Alteriom/*'],
 * });
 *
 * ws.on('event', (e) => console.log(e.event, e.repository));
 * ws.connect();
 * ```
 */
export class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: { [K in keyof WebSocketEventMap]?: WebSocketEventMap[K][] } = {};
  private currentEvents: string[];
  private currentRepos: string[];

  constructor(private config: WebSocketClientConfig) {
    this.currentEvents = config.events ?? ['*'];
    this.currentRepos = config.repos ?? ['*'];
  }

  /**
   * Connect to the webhook connector's WebSocket server.
   * Authenticates with API key and subscribes to configured filters.
   */
  connect(): void {
    this.socket = io(this.config.url, {
      path: '/ws',
      auth: {
        apiKey: this.config.apiKey,
        name: this.config.name ?? 'webhook-client',
      },
      reconnection: this.config.reconnect ?? true,
      reconnectionDelay: this.config.reconnectDelay ?? 1000,
      reconnectionDelayMax: this.config.reconnectDelayMax ?? 10000,
    });

    // Auto-resubscribe on every connect (including reconnects)
    this.socket.on('connect', () => {
      this.emitSubscribe();
    });

    // Server confirms authentication — forward to listeners and subscribe
    this.socket.on('connected', (data: { message: string; clientId: string }) => {
      this.config.logger?.info(`WebSocket connected: ${data.clientId}`);
      this.emitSubscribe();
      this.emit('connected', { clientId: data.clientId });
    });

    // Forward webhook events
    this.socket.on('webhook-event', (payload: WebhookEventPayload) => {
      this.emit('event', payload);
    });

    // Forward subscription confirmation
    this.socket.on('subscribed', (filters: { events: string[]; repos: string[] }) => {
      this.config.logger?.info(`Subscribed: ${JSON.stringify(filters)}`);
      this.emit('subscribed', filters);
    });

    // Forward disconnection
    this.socket.on('disconnect', (reason: string) => {
      this.config.logger?.info(`WebSocket disconnected: ${reason}`);
      this.emit('disconnected', reason);
    });

    // Forward connection errors
    this.socket.on('connect_error', (err: Error) => {
      this.config.logger?.error(`WebSocket error: ${err.message}`);
      this.emit('error', err);
    });
  }

  /**
   * Register a typed event handler. Returns `this` for chaining.
   */
  on<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]!.push(handler);
    return this;
  }

  /**
   * Remove a previously registered handler.
   */
  off<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this {
    const list = this.handlers[event];
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
    return this;
  }

  /**
   * Disconnect from the server and clean up.
   */
  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  /**
   * Whether the socket is currently connected.
   */
  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

  /**
   * Update subscription filters. If connected, sends immediately.
   * If not connected, stores for next connect.
   * Only overrides provided fields — omitted fields keep current value.
   */
  updateSubscription(filters: { events?: string[]; repos?: string[] }): void {
    if (filters.events) this.currentEvents = filters.events;
    if (filters.repos) this.currentRepos = filters.repos;

    if (this.socket?.connected) {
      this.emitSubscribe();
    }
  }

  private emitSubscribe(): void {
    this.socket?.emit('subscribe', {
      events: this.currentEvents,
      repos: this.currentRepos,
    });
  }

  private emit<K extends keyof WebSocketEventMap>(event: K, ...args: Parameters<WebSocketEventMap[K]>): void {
    const list = this.handlers[event];
    if (list) {
      for (const handler of list) {
        (handler as (...a: any[]) => void)(...args);
      }
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /home/ubuntu/claude/worktrees/webhook-client-ws && npm test -- --testPathPattern=ws-client`
Expected: PASS (all tests)

- [ ] **Step 5: Commit**

```bash
git add src/ws-client.ts tests/ws-client.test.ts
git commit -m "feat(#105): implement WebSocketClient with auto-resubscribe"
```

---

### Task 3: Wire up exports and package.json

**Files:**
- Modify: `src/index.ts:113-119`
- Modify: `package.json:42-56`

- [ ] **Step 1: Add exports to index.ts**

Add after line 119 (after the receiver exports):

```typescript
// Export WebSocket client
export { WebSocketClient } from './ws-client';
export type {
  WebSocketClientConfig,
  WebhookEventPayload,
  WebSocketEventMap,
} from './ws-types';
```

- [ ] **Step 2: Add socket.io-client as peer and dev dependency**

Run:
```bash
npm install --save-dev socket.io-client
```

Then edit `package.json` to add peer dependency. After the `"dependencies"` block:

```json
"peerDependencies": {
  "socket.io-client": ">=4.0.0"
},
"peerDependenciesMeta": {
  "socket.io-client": {
    "optional": true
  }
},
```

- [ ] **Step 3: Verify build compiles**

Run: `npm run build`
Expected: No TypeScript errors

- [ ] **Step 4: Run full test suite**

Run: `npm test`
Expected: All tests pass (existing + new ws-client tests)

- [ ] **Step 5: Commit**

```bash
git add src/index.ts package.json package-lock.json
git commit -m "chore(#105): export WebSocketClient and add socket.io-client peer dep"
```

---

### Task 4: Update README and CHANGELOG

**Files:**
- Modify: `README.md`
- Modify: `CHANGELOG.md`
- Modify: `package.json` (version bump)

- [ ] **Step 1: Bump version to 1.1.0**

In `package.json`, change `"version": "1.0.0"` to `"version": "1.1.0"`.

In `src/client.ts`, change `'X-Client-Version': '1.0.0'` to `'X-Client-Version': '1.1.0'`.

- [ ] **Step 2: Add WebSocket section to README**

Add a new section after the existing "Quick Start" sections (find the appropriate location):

```markdown
## Real-Time Events — WebSocket

Stream webhook events in real-time via the connector's Socket.IO server.

**Requires:** `npm install socket.io-client` (optional peer dependency)

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

ws.on('error', (err) => {
  console.error('Connection error:', err.message);
});

ws.connect();

// Update filters without reconnecting
ws.updateSubscription({ events: ['workflow_run.completed'] });

// Clean shutdown
ws.disconnect();
```

### WebSocket Features

- **Auto-resubscribe:** Subscription filters are re-sent on every reconnect (server loses state on disconnect)
- **Typed payloads:** `WebhookEventPayload` with `event`, `action`, `repository`, `summary`, `payload`
- **Configurable filters:** Event types (`push`, `pull_request.opened`) and repo patterns (`Alteriom/*`)
- **Lifecycle events:** `connected`, `disconnected`, `subscribed`, `error`
- **Optional dependency:** `socket.io-client` is a peer dep — REST-only consumers don't need it
```

- [ ] **Step 3: Add v1.1.0 entry to CHANGELOG**

Add at the top of the changelog (after the header):

```markdown
## [1.1.0] - 2026-03-28

### Added
- **WebSocketClient** — real-time event streaming via Socket.IO wrapper
  - Auto-resubscribe on reconnect (server loses subscription state)
  - Typed `WebhookEventPayload` matching server's `webhook-event` emission
  - Configurable event and repository filters with glob support
  - Lifecycle events: `connected`, `disconnected`, `subscribed`, `error`
  - `updateSubscription()` to change filters without reconnecting
- `socket.io-client` as optional peer dependency (REST-only consumers unaffected)
```

Update the compare link at the bottom:
```markdown
[1.1.0]: https://github.com/Alteriom/webhook-client/compare/v1.0.0...v1.1.0
```

- [ ] **Step 4: Regenerate package-lock**

Run: `npm install --package-lock-only`

- [ ] **Step 5: Run full test suite and build**

Run: `npm test && npm run build`
Expected: All pass

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/client.ts README.md CHANGELOG.md
git commit -m "feat(#105): bump to v1.1.0 with WebSocket client docs"
```

---

## Sequencing

```
Task 1: Types (ws-types.ts + type tests)
  ↓
Task 2: Implementation (ws-client.ts + full tests)
  ↓
Task 3: Exports + package.json
  ↓
Task 4: README + CHANGELOG + version bump
```

All tasks are sequential — each builds on the previous.
