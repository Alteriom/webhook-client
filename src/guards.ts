/**
 * Type guards for runtime validation
 * @module guards
 */

import type {
  Enrichment,
  SubscriptionDelivery,
  WebhookEvent,
  EventAggregate,
  ApiError,
  RateLimitError,
} from './types';

/**
 * Type guard for Enrichment
 */
export function isEnrichment(obj: unknown): obj is Enrichment {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const e = obj as Record<string, unknown>;

  return (
    typeof e.summary === 'string' &&
    typeof e.risk_level === 'string' &&
    ['low', 'medium', 'high', 'critical'].includes(e.risk_level as string) &&
    typeof e.complexity === 'number' &&
    Array.isArray(e.security_concerns) &&
    e.security_concerns.every((c: unknown) => typeof c === 'string') &&
    Array.isArray(e.suggested_actions) &&
    e.suggested_actions.every((a: unknown) => typeof a === 'string')
  );
}

/**
 * Type guard for SubscriptionDelivery
 */
export function isSubscriptionDelivery(obj: unknown): obj is SubscriptionDelivery {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const d = obj as Record<string, unknown>;

  return (
    typeof d.subscription_id === 'string' &&
    typeof d.delivery_mode === 'string' &&
    ['realtime', 'aggregate'].includes(d.delivery_mode as string) &&
    typeof d.delivered_at === 'string'
  );
}

/**
 * Type guard for WebhookEvent
 */
export function isWebhookEvent(obj: unknown): obj is WebhookEvent {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const e = obj as Record<string, unknown>;

  return (
    typeof e.id === 'string' &&
    typeof e.event_type === 'string' &&
    typeof e.github_delivery_id === 'string' &&
    typeof e.payload === 'object' &&
    typeof e.received_at === 'string' &&
    typeof e.processing_status === 'string' &&
    ['pending', 'completed', 'failed'].includes(e.processing_status as string)
  );
}

/**
 * Type guard for EventAggregate
 */
export function isEventAggregate(obj: unknown): obj is EventAggregate {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const a = obj as Record<string, unknown>;

  return (
    typeof a.id === 'string' &&
    typeof a.repository === 'string' &&
    typeof a.entity_type === 'string' &&
    typeof a.entity_id === 'string' &&
    typeof a.aggregate_type === 'string' &&
    typeof a.summary === 'object' &&
    typeof a.event_count === 'number' &&
    typeof a.first_event_at === 'string' &&
    typeof a.last_event_at === 'string'
  );
}

/**
 * Type guard for ApiError
 */
export function isApiError(obj: unknown): obj is ApiError {
  if (typeof obj !== 'object' || obj === null) {
    return false;
  }

  const e = obj as Record<string, unknown>;

  return (
    typeof e.error === 'string' &&
    typeof e.status === 'number'
  );
}

/**
 * Type guard for RateLimitError
 */
export function isRateLimitError(obj: unknown): obj is RateLimitError {
  if (!isApiError(obj)) {
    return false;
  }

  const r = obj as unknown as Record<string, unknown>;

  return (
    r.status === 429 &&
    typeof r.retryAfter === 'number' &&
    typeof r.limit === 'number' &&
    typeof r.remaining === 'number'
  );
}

/**
 * Validate and parse JSON with type guard
 */
export function parseAs<T>(
  json: string,
  guard: (obj: unknown) => obj is T
): T {
  const obj = JSON.parse(json);
  if (guard(obj)) {
    return obj;
  }
  throw new Error('Invalid JSON structure');
}
