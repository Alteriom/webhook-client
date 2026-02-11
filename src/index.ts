/**
 * @alteriom/webhook-client
 * Type-safe client for Alteriom Webhook Connector
 * @version 0.0.1
 */

// Export all types
export * from './types';

// Export type guards
export * from './guards';

// Export error classes
export * from './errors';

// Re-export commonly used types for convenience
export type {
  WebhookEvent,
  EventAggregate,
  Enrichment,
  SubscriptionDelivery,
  Subscriber,
  Delivery,
  ApiError as IApiError,
  ValidationError as IValidationError,
  RateLimitError as IRateLimitError,
} from './types';

// Re-export error classes
export {
  ApiError,
  RateLimitError,
  ValidationError,
  SignatureVerificationError,
  WebhookExpiredError,
} from './errors';

// Re-export commonly used guards
export {
  isEnrichment,
  isSubscriptionDelivery,
  isWebhookEvent,
  isEventAggregate,
} from './guards';

// Export API client
export { AlteriomWebhookClient } from './client';
export type { ClientConfig } from './client';

// Export webhook receiver
export { webhookReceiver, generateWebhookSignature } from './receiver';
export type { ReceiverConfig } from './receiver';

// Export framework adapters
export { expressReceiver, fastifyReceiver, nextjsReceiver } from './adapters';
