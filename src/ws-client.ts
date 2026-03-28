import { io, Socket } from 'socket.io-client';
import type { WebhookEventPayload, WebSocketClientConfig, WebSocketEventMap } from './ws-types';

export class WebSocketClient {
  private socket: Socket | null = null;
  private handlers: { [K in keyof WebSocketEventMap]?: WebSocketEventMap[K][] } = {};
  private currentEvents: string[];
  private currentRepos: string[];

  constructor(private config: WebSocketClientConfig) {
    this.currentEvents = config.events ?? ['*'];
    this.currentRepos = config.repos ?? ['*'];
  }

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

    // Server confirms authentication
    this.socket.on('connected', (data: { message: string; clientId: string }) => {
      this.config.logger?.info(`WebSocket connected: ${data.clientId}`);
      this.emitSubscribe();
      this.emit('connected', { clientId: data.clientId });
    });

    this.socket.on('webhook-event', (payload: WebhookEventPayload) => {
      this.emit('event', payload);
    });

    this.socket.on('subscribed', (filters: { events: string[]; repos: string[] }) => {
      this.config.logger?.info(`Subscribed: ${JSON.stringify(filters)}`);
      this.emit('subscribed', filters);
    });

    this.socket.on('disconnect', (reason: string) => {
      this.config.logger?.info(`WebSocket disconnected: ${reason}`);
      this.emit('disconnected', reason);
    });

    this.socket.on('connect_error', (err: Error) => {
      this.config.logger?.error(`WebSocket error: ${err.message}`);
      this.emit('error', err);
    });
  }

  on<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this {
    if (!this.handlers[event]) {
      this.handlers[event] = [];
    }
    this.handlers[event]!.push(handler);
    return this;
  }

  off<K extends keyof WebSocketEventMap>(event: K, handler: WebSocketEventMap[K]): this {
    const list = this.handlers[event];
    if (list) {
      const idx = list.indexOf(handler);
      if (idx !== -1) list.splice(idx, 1);
    }
    return this;
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }

  get connected(): boolean {
    return this.socket?.connected ?? false;
  }

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
