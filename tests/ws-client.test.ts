/**
 * Tests for WebSocketClient
 * @jest-environment node
 */

import { WebSocketClient } from '../src/ws-client';
import type { WebhookEventPayload, WebSocketClientConfig } from '../src/ws-types';

// ---- Mock socket.io-client ----

type SocketEventHandler = (...args: any[]) => void;

interface MockSocket {
  on: jest.Mock;
  emit: jest.Mock;
  disconnect: jest.Mock;
  connected: boolean;
  _handlers: Record<string, SocketEventHandler[]>;
  _trigger: (event: string, ...args: any[]) => void;
}

function createMockSocket(): MockSocket {
  const handlers: Record<string, SocketEventHandler[]> = {};

  const socket: MockSocket = {
    on: jest.fn((event: string, handler: SocketEventHandler) => {
      if (!handlers[event]) handlers[event] = [];
      handlers[event].push(handler);
    }),
    emit: jest.fn(),
    disconnect: jest.fn(),
    connected: false,
    _handlers: handlers,
    _trigger: (event: string, ...args: any[]) => {
      (handlers[event] ?? []).forEach((h) => h(...args));
    },
  };

  return socket;
}

let mockSocket: MockSocket;
const mockIo = jest.fn();

jest.mock('socket.io-client', () => ({
  io: (...args: any[]) => mockIo(...args),
}));

// ---- Helpers ----

const baseConfig: WebSocketClientConfig = {
  url: 'https://ws.example.com',
  apiKey: 'test-api-key',
};

function makeClient(config: Partial<WebSocketClientConfig> = {}): WebSocketClient {
  return new WebSocketClient({ ...baseConfig, ...config });
}

beforeEach(() => {
  mockSocket = createMockSocket();
  mockIo.mockReturnValue(mockSocket);
});

// ---- Tests ----

describe('WebSocketClient', () => {

  // 1. connect() calls io() with correct URL, path '/ws', and auth object
  it('calls io() with correct URL, path /ws, and auth object', () => {
    const client = makeClient({ apiKey: 'my-key', name: 'my-app' });
    client.connect();

    expect(mockIo).toHaveBeenCalledWith(
      'https://ws.example.com',
      expect.objectContaining({
        path: '/ws',
        auth: {
          apiKey: 'my-key',
          name: 'my-app',
        },
      })
    );
  });

  // 2. Uses default name 'webhook-client' when not provided
  it('uses default name "webhook-client" when name is not provided', () => {
    const client = makeClient();
    client.connect();

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: expect.objectContaining({ name: 'webhook-client' }),
      })
    );
  });

  // 3. Passes custom reconnection config
  it('passes custom reconnection config to socket.io', () => {
    const client = makeClient({
      reconnect: false,
      reconnectDelay: 500,
      reconnectDelayMax: 5000,
    });
    client.connect();

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reconnection: false,
        reconnectionDelay: 500,
        reconnectionDelayMax: 5000,
      })
    );
  });

  // 4. Emits subscribe with configured filters on 'connected' server event
  it('emits subscribe with configured filters on "connected" server event', () => {
    const client = makeClient({ events: ['push', 'pull_request'], repos: ['my-repo'] });
    client.connect();

    mockSocket._trigger('connected', { message: 'ok', clientId: 'cid-1' });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['push', 'pull_request'],
      repos: ['my-repo'],
    });
  });

  // 5. Defaults to ['*'] for events and repos
  it('defaults events and repos to ["*"] when not provided', () => {
    const client = makeClient();
    client.connect();

    mockSocket._trigger('connected', { message: 'ok', clientId: 'cid-1' });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['*'],
      repos: ['*'],
    });
  });

  // 6. Re-emits subscribe on Socket.IO 'connect' event (reconnect scenario)
  it('emits subscribe on socket.io "connect" event (reconnect scenario)', () => {
    const client = makeClient({ events: ['push'], repos: ['repo-a'] });
    client.connect();

    mockSocket.emit.mockClear();
    mockSocket._trigger('connect');

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['push'],
      repos: ['repo-a'],
    });
  });

  // 7. Forwards 'webhook-event' to registered 'event' handlers
  it('forwards "webhook-event" socket event to registered "event" handlers', () => {
    const client = makeClient();
    client.connect();

    const handler = jest.fn();
    client.on('event', handler);

    const payload: WebhookEventPayload = {
      event: 'push',
      delivery_id: 'del-1',
      summary: 'Push to main',
      payload: { commits: [] },
      received_at: '2026-03-28T00:00:00Z',
      dispatched_at: '2026-03-28T00:00:01Z',
    };

    mockSocket._trigger('webhook-event', payload);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(payload);
  });

  // 8. Forwards 'connected' to handlers (with only clientId, not message)
  it('forwards "connected" server event to handlers with only clientId', () => {
    const client = makeClient();
    client.connect();

    const handler = jest.fn();
    client.on('connected', handler);

    mockSocket._trigger('connected', { message: 'Hello', clientId: 'cid-42' });

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith({ clientId: 'cid-42' });
    // message should NOT be forwarded
    expect(handler).not.toHaveBeenCalledWith(expect.objectContaining({ message: expect.anything() }));
  });

  // 9. Forwards 'disconnect' to 'disconnected' handlers
  it('forwards socket "disconnect" to "disconnected" handlers', () => {
    const client = makeClient();
    client.connect();

    const handler = jest.fn();
    client.on('disconnected', handler);

    mockSocket._trigger('disconnect', 'transport close');

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith('transport close');
  });

  // 10. Forwards 'subscribed' to handlers
  it('forwards "subscribed" server event to handlers', () => {
    const client = makeClient();
    client.connect();

    const handler = jest.fn();
    client.on('subscribed', handler);

    const filters = { events: ['push'], repos: ['repo-x'] };
    mockSocket._trigger('subscribed', filters);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(filters);
  });

  // 11. Forwards 'connect_error' to 'error' handlers
  it('forwards "connect_error" to "error" handlers', () => {
    const client = makeClient();
    client.connect();

    const handler = jest.fn();
    client.on('error', handler);

    const err = new Error('auth failed');
    mockSocket._trigger('connect_error', err);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(handler).toHaveBeenCalledWith(err);
  });

  // 12. Multiple handlers on same event all called
  it('calls all registered handlers for the same event', () => {
    const client = makeClient();
    client.connect();

    const handler1 = jest.fn();
    const handler2 = jest.fn();
    const handler3 = jest.fn();
    client.on('disconnected', handler1);
    client.on('disconnected', handler2);
    client.on('disconnected', handler3);

    mockSocket._trigger('disconnect', 'server namespace disconnect');

    expect(handler1).toHaveBeenCalledTimes(1);
    expect(handler2).toHaveBeenCalledTimes(1);
    expect(handler3).toHaveBeenCalledTimes(1);
  });

  // 13. off() removes handler
  it('off() removes a specific handler so it is no longer called', () => {
    const client = makeClient();
    client.connect();

    const handler1 = jest.fn();
    const handler2 = jest.fn();
    client.on('disconnected', handler1);
    client.on('disconnected', handler2);

    client.off('disconnected', handler1);

    mockSocket._trigger('disconnect', 'io client disconnect');

    expect(handler1).not.toHaveBeenCalled();
    expect(handler2).toHaveBeenCalledTimes(1);
  });

  // 14. disconnect() calls socket.disconnect()
  it('disconnect() calls socket.disconnect() and nulls the socket', () => {
    const client = makeClient();
    client.connect();

    client.disconnect();

    expect(mockSocket.disconnect).toHaveBeenCalledTimes(1);
  });

  // 15. connected getter returns false before connect, true when socket.connected is true
  it('connected getter returns false before connect()', () => {
    const client = makeClient();
    expect(client.connected).toBe(false);
  });

  it('connected getter returns true when socket.connected is true', () => {
    const client = makeClient();
    client.connect();

    mockSocket.connected = true;
    expect(client.connected).toBe(true);
  });

  it('connected getter returns false when socket.connected is false', () => {
    const client = makeClient();
    client.connect();

    mockSocket.connected = false;
    expect(client.connected).toBe(false);
  });

  // 16. updateSubscription() emits subscribe when connected
  it('updateSubscription() emits subscribe immediately when socket is connected', () => {
    const client = makeClient({ events: ['push'], repos: ['repo-a'] });
    client.connect();

    mockSocket.connected = true;
    mockSocket.emit.mockClear();

    client.updateSubscription({ events: ['pull_request'] });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['pull_request'],
      repos: ['repo-a'],
    });
  });

  // 17. updateSubscription() stores filters for next connect when not connected
  it('updateSubscription() stores filters without emitting when not connected', () => {
    const client = makeClient({ events: ['push'], repos: ['repo-a'] });
    client.connect();

    mockSocket.connected = false;
    mockSocket.emit.mockClear();

    client.updateSubscription({ events: ['pull_request'] });

    // Should not have emitted subscribe
    expect(mockSocket.emit).not.toHaveBeenCalledWith('subscribe', expect.anything());

    // But when connected event fires, new filters should be used
    mockSocket._trigger('connected', { message: 'ok', clientId: 'cid-x' });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['pull_request'],
      repos: ['repo-a'],
    });
  });

  // 18. updateSubscription() partially updates (only overrides provided fields)
  it('updateSubscription() partially updates: repos-only update preserves events', () => {
    const client = makeClient({ events: ['push', 'pull_request'], repos: ['repo-a'] });
    client.connect();

    mockSocket.connected = true;
    mockSocket.emit.mockClear();

    client.updateSubscription({ repos: ['repo-b', 'repo-c'] });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['push', 'pull_request'],
      repos: ['repo-b', 'repo-c'],
    });
  });

  it('updateSubscription() partially updates: events-only update preserves repos', () => {
    const client = makeClient({ events: ['push'], repos: ['repo-x'] });
    client.connect();

    mockSocket.connected = true;
    mockSocket.emit.mockClear();

    client.updateSubscription({ events: ['issues'] });

    expect(mockSocket.emit).toHaveBeenCalledWith('subscribe', {
      events: ['issues'],
      repos: ['repo-x'],
    });
  });

  // 19. on() returns this for chaining
  it('on() returns this for chaining', () => {
    const client = makeClient();
    const result = client.on('event', jest.fn());
    expect(result).toBe(client);
  });

  it('supports fluent chaining of multiple on() calls', () => {
    const client = makeClient();
    const h1 = jest.fn();
    const h2 = jest.fn();
    const h3 = jest.fn();

    const result = client
      .on('event', h1)
      .on('connected', h2)
      .on('disconnected', h3);

    expect(result).toBe(client);
  });

  // Logger calls
  it('calls logger.info on "connected" server event', () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    const client = makeClient({ logger });
    client.connect();

    mockSocket._trigger('connected', { message: 'ok', clientId: 'cid-99' });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('cid-99'));
  });

  it('calls logger.info on "subscribed" server event', () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    const client = makeClient({ logger });
    client.connect();

    mockSocket._trigger('subscribed', { events: ['push'], repos: ['*'] });

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('Subscribed'));
  });

  it('calls logger.info on "disconnect" event', () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    const client = makeClient({ logger });
    client.connect();

    mockSocket._trigger('disconnect', 'io server disconnect');

    expect(logger.info).toHaveBeenCalledWith(expect.stringContaining('disconnected'));
  });

  it('calls logger.error on "connect_error" event', () => {
    const logger = { info: jest.fn(), error: jest.fn() };
    const client = makeClient({ logger });
    client.connect();

    mockSocket._trigger('connect_error', new Error('ECONNREFUSED'));

    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('ECONNREFUSED'));
  });

  // Default reconnection values
  it('uses default reconnection values when not specified', () => {
    const client = makeClient();
    client.connect();

    expect(mockIo).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 10000,
      })
    );
  });

  // disconnect() before connect is a no-op
  it('disconnect() before connect() is a no-op', () => {
    const client = makeClient();
    expect(() => client.disconnect()).not.toThrow();
    expect(mockSocket.disconnect).not.toHaveBeenCalled();
  });
});
