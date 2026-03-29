// src/ws-types.ts

/**
 * Payload shape for webhook events received via WebSocket.
 * Matches the server's `webhook-event` emission in ws-adapter.ts.
 */
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

export interface WebSocketClientConfig {
  url: string;
  apiKey: string;
  name?: string;
  events?: string[];
  repos?: string[];
  reconnect?: boolean;
  reconnectDelay?: number;
  reconnectDelayMax?: number;
  logger?: {
    info: (msg: string) => void;
    error: (msg: string) => void;
  };
}

export type WebSocketEventMap = {
  event: (payload: WebhookEventPayload) => void;
  connected: (data: { clientId: string }) => void;
  disconnected: (reason: string) => void;
  subscribed: (filters: { events: string[]; repos: string[] }) => void;
  error: (err: Error) => void;
};
