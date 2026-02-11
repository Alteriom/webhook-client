/**
 * TypeScript types for Alteriom Webhook Connector
 * Auto-generated from OpenAPI 3.1 spec
 * @see https://webhook.alteriom.net/openapi.json
 */

// ============================================================================
// Core Types
// ============================================================================

/**
 * GitHub webhook event persisted in database
 */
export interface WebhookEvent {
  id: string;
  event_type: string;
  action: string | null;
  repository: string | null;
  sender: string | null;
  github_delivery_id: string;
  payload: Record<string, unknown>;
  received_at: string;
  processing_status: 'pending' | 'completed' | 'failed';
  processing_error: string | null;
}

/**
 * Aggregated GitHub events grouped by entity
 */
export interface EventAggregate {
  id: string;
  repository: string;
  entity_type: 'issue' | 'pull_request' | 'commit' | 'discussion' | 'release' | 'workflow' | 'other';
  entity_id: string;
  aggregate_type: string;
  summary: Record<string, unknown>;
  event_count: number;
  first_event_at: string;
  last_event_at: string;
  enrichment?: Enrichment;
}

/**
 * AI-powered enrichment analysis for an event aggregate.
 * Generated via GitHub Copilot GPT-4 with cost tracking.
 */
export interface Enrichment {
  /** 2-3 sentence summary of the aggregate */
  summary: string;
  
  /** Risk assessment: low, medium, high, or critical */
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  
  /** Complexity score (1-10) */
  complexity: number;
  
  /** Array of security concerns identified */
  security_concerns: string[];
  
  /** AI-suggested actions for the agent to take */
  suggested_actions: string[];
  
  /** Cost in USD for generating this enrichment */
  cost_usd?: number;
}

/**
 * Webhook delivery payload sent to agents
 */
export interface SubscriptionDelivery {
  subscription_id: string;
  delivery_mode: 'realtime' | 'aggregate';
  aggregate?: EventAggregate;
  events?: WebhookEvent[];
  delivered_at: string;
}

/**
 * Subscription configuration
 */
export interface Subscriber {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters?: V2Filters;
  delivery_config?: DeliveryConfig;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Delivery attempt record
 */
export interface Delivery {
  id: string;
  subscription_id: string;
  aggregate_id?: string;
  event_id?: string;
  status: 'pending' | 'delivered' | 'failed' | 'dead';
  http_code?: number;
  latency_ms?: number;
  error?: string;
  attempt_number: number;
  delivered_at?: string;
  created_at: string;
}

/**
 * Advanced filtering configuration
 */
export interface V2Filters {
  repositories?: string[];
  branches?: string[];
  senders?: string[];
  labels?: string[];
  conditions?: Record<string, unknown>;
}

/**
 * Delivery retry configuration
 */
export interface DeliveryConfig {
  timeout_ms?: number;
  max_retries?: number;
  backoff_base_ms?: number;
  backoff_multiplier?: number;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Base API error
 */
export interface ApiError {
  error: string;
  details?: Record<string, string[]>;
  status: number;
}

/**
 * Validation error with field-level details
 */
export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

/**
 * Rate limit error with retry information
 */
export interface RateLimitError extends ApiError {
  retryAfter: number; // seconds
  limit: number;
  remaining: number;
}

// ============================================================================
// Enum Types
// ============================================================================

/**
 * Event processing status
 */
export type EventStatus = 'pending' | 'completed' | 'failed';

/**
 * Risk level assessment
 */
export type RiskLevel = 'low' | 'medium' | 'high' | 'critical';

/**
 * Delivery status
 */
export type DeliveryStatus = 'pending' | 'delivered' | 'failed' | 'dead';

/**
 * Delivery mode
 */
export type DeliveryMode = 'realtime' | 'aggregate';

/**
 * Entity type for aggregation
 */
export type EntityType = 'issue' | 'pull_request' | 'commit' | 'discussion' | 'release' | 'workflow' | 'other';

// ============================================================================
// API Request/Response Types
// ============================================================================

/**
 * Paginated response wrapper
 */
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

/**
 * Event list request params
 */
export interface EventListParams {
  page?: number;
  limit?: number;
  event_type?: string;
  status?: EventStatus;
  repository?: string;
  sender?: string;
  search?: string;
  from?: string;
  to?: string;
}

/**
 * Subscription create request
 */
export interface CreateSubscriberRequest {
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters?: V2Filters;
  delivery_config?: DeliveryConfig;
}

/**
 * Subscription update request
 */
export interface UpdateSubscriberRequest {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  filters?: V2Filters;
  delivery_config?: DeliveryConfig;
  enabled?: boolean;
}

// ============================================================================
// WebSocket Types
// ============================================================================

/**
 * WebSocket authentication
 */
export interface WebSocketAuth {
  apiKey: string;
  name: string;
}

/**
 * WebSocket event payload
 */
export interface WebSocketEvent {
  event: WebhookEvent;
  timestamp: string;
}
