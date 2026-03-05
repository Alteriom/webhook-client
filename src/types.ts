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

// ============================================================================
// Security Types
// ============================================================================

/**
 * Dependabot vulnerability alert
 */
export interface DependabotAlert {
  id: string;
  repository: string;
  alert_number: number;
  state: 'open' | 'dismissed' | 'fixed';
  dependency_package: string;
  dependency_ecosystem: string;
  dependency_manifest_path: string | null;
  dependency_scope: string | null;
  vulnerability_severity: 'low' | 'medium' | 'high' | 'critical';
  vulnerability_summary: string;
  vulnerability_description: string | null;
  vulnerability_ghsa_id: string;
  vulnerability_cve_id: string | null;
  vulnerable_version_range: string | null;
  patched_version: string | null;
  dismissed_reason: string | null;
  dismissed_comment: string | null;
  dismissed_at: string | null;
  fixed_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Code scanning security alert
 */
export interface CodeScanningAlert {
  id: string;
  repository: string;
  alert_number: number;
  state: 'open' | 'dismissed' | 'fixed';
  rule_id: string;
  rule_description: string;
  rule_severity: 'note' | 'warning' | 'error';
  tool_name: string;
  tool_version: string | null;
  most_recent_instance_location: string | null;
  most_recent_instance_message: string | null;
  instances_count: number;
  dismissed_reason: string | null;
  dismissed_comment: string | null;
  dismissed_at: string | null;
  fixed_at: string | null;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * Secret scanning security alert
 */
export interface SecretScanningAlert {
  id: string;
  repository: string;
  alert_number: number;
  state: 'open' | 'resolved';
  secret_type: string;
  secret_type_display_name: string;
  resolution: string | null;
  resolution_comment: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  push_protection_bypassed: boolean;
  push_protection_bypassed_at: string | null;
  locations_count: number;
  created_at: string;
  updated_at: string;
  html_url: string;
}

/**
 * GitHub Security Advisory
 */
export interface SecurityAdvisory {
  id: string;
  ghsa_id: string;
  cve_id: string | null;
  summary: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cvss_score: number | null;
  cvss_vector_string: string | null;
  published_at: string;
  updated_at: string;
  withdrawn_at: string | null;
  vulnerabilities: SecurityVulnerability[];
  affected_repositories: string[];
  triage_status: 'pending' | 'not_applicable' | 'resolved';
  triage_reason: string | null;
  triage_notes: string | null;
  triaged_at: string | null;
  triaged_by: string | null;
  html_url: string;
}

/**
 * Security vulnerability within an advisory
 */
export interface SecurityVulnerability {
  package_name: string;
  package_ecosystem: string;
  vulnerable_version_range: string;
  patched_versions: string[];
  first_patched_version: string | null;
}

/**
 * Remediation queue item (critical/high priority alerts)
 */
export interface RemediationQueueItem {
  id: string;
  type: 'dependabot' | 'code_scanning' | 'secret_scanning';
  repository: string;
  alert_number: number;
  severity: 'critical' | 'high';
  title: string;
  created_at: string;
  age_days: number;
  html_url: string;
}

/**
 * Repository risk level summary
 */
export interface RepositoryRiskLevel {
  repository: string;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  alert_counts: {
    dependabot: number;
    code_scanning: number;
    secret_scanning: number;
  };
  critical_count: number;
  high_count: number;
}

/**
 * Security badge counts
 */
export interface BadgeCounts {
  dependabot: {
    total: number;
    open: number;
    by_severity: {
      critical: number;
      high: number;
      medium: number;
      low: number;
    };
  };
  code_scanning: {
    total: number;
    open: number;
    by_severity: {
      error: number;
      warning: number;
      note: number;
    };
  };
  secret_scanning: {
    total: number;
    open: number;
  };
}

/**
 * Alert statistics
 */
export interface AlertStats {
  total: number;
  by_state: {
    open?: number;
    dismissed?: number;
    fixed?: number;
    resolved?: number;
  };
  by_severity: {
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    error?: number;
    warning?: number;
    note?: number;
  };
}

// ============================================================================
// Repository Types
// ============================================================================

/**
 * Repository configuration
 */
export interface Repository {
  id: string;
  owner: string;
  name: string;
  full_name: string;
  scan_enabled: boolean;
  default_branch: string | null;
  visibility: 'public' | 'private' | 'internal';
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string | null;
}

/**
 * Repository update request
 */
export interface RepositoryUpdateRequest {
  scan_enabled?: boolean;
}

// ============================================================================
// HTTP Subscriber Types
// ============================================================================

/**
 * HTTP webhook subscriber configuration
 */
export interface HttpSubscriber {
  id: string;
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters: Record<string, unknown>;
  enabled: boolean;
  delivery_stats: {
    total_deliveries: number;
    successful_deliveries: number;
    failed_deliveries: number;
    last_delivery_at: string | null;
    avg_latency_ms: number | null;
  };
  created_at: string;
  updated_at: string;
}

/**
 * HTTP subscriber create request
 */
export interface HttpSubscriberCreateRequest {
  name: string;
  url: string;
  secret: string;
  events: string[];
  filters?: Record<string, unknown>;
}

/**
 * HTTP subscriber update request
 */
export interface HttpSubscriberUpdateRequest {
  name?: string;
  url?: string;
  secret?: string;
  events?: string[];
  filters?: Record<string, unknown>;
  enabled?: boolean;
}

/**
 * HTTP subscriber test result
 */
export interface HttpSubscriberTestResult {
  success: boolean;
  status_code?: number;
  latency_ms?: number;
  error?: string;
}

// ============================================================================
// API Key Types
// ============================================================================

/**
 * API key configuration
 */
export interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  description: string | null;
  scopes: string[];
  owner: string | null;
  created_by: string | null;
  last_used_at: string | null;
  expires_at: string | null;
  auto_rotate: boolean;
  rotation_days: number | null;
  active: boolean;
  created_at: string;
}

/**
 * API key create request
 */
export interface ApiKeyCreateRequest {
  name: string;
  description?: string;
  scopes: string[];
  expires_at?: string;
  auto_rotate?: boolean;
  rotation_days?: number;
}

/**
 * API key update request
 */
export interface ApiKeyUpdateRequest {
  name?: string;
  description?: string;
  scopes?: string[];
  expires_at?: string;
  auto_rotate?: boolean;
  rotation_days?: number;
  active?: boolean;
}

/**
 * API key rotation result
 */
export interface ApiKeyRotationResult {
  id: string;
  new_key: string;
  expires_at: string | null;
}

// ============================================================================
// Audit Types
// ============================================================================

/**
 * Audit log entry
 */
export interface AuditEvent {
  id: string;
  event_type: string;
  actor: string;
  resource_type: string;
  resource_id: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// ============================================================================
// Health Types
// ============================================================================

/**
 * System health status
 */
export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  version: string;
  uptime_seconds: number;
  checks: {
    database: boolean;
    redis: boolean;
    queue: boolean;
  };
  timestamp: string;
}

/**
 * Handler configuration status
 */
export interface HandlerConfig {
  event_type: string;
  handler_name: string;
  enabled: boolean;
  priority: number;
  config: Record<string, unknown>;
}

/**
 * Pending events summary
 */
export interface PendingEvents {
  total: number;
  by_status: {
    pending: number;
    processing: number;
    failed: number;
  };
  oldest_pending_at: string | null;
}

// ============================================================================
// Dashboard Types
// ============================================================================

/**
 * Dashboard overview statistics
 */
export interface DashboardStats {
  total_events: number;
  total_deliveries: number;
  active_subscribers: number;
  delivery_success_rate: number;
  avg_latency_ms: number;
  events_24h: number;
  events_7d: number;
  top_repositories: Array<{
    repository: string;
    event_count: number;
  }>;
  top_event_types: Array<{
    event_type: string;
    count: number;
  }>;
}

/**
 * Time-series data point
 */
export interface TimeSeriesPoint {
  timestamp: string;
  value: number;
}

// ============================================================================
// Pipeline Types
// ============================================================================

/**
 * CI/CD pipeline status
 */
export interface PipelineStatus {
  repository: string;
  workflow_name: string;
  status: 'success' | 'failure' | 'in_progress' | 'cancelled';
  conclusion: string | null;
  branch: string;
  commit_sha: string;
  commit_message: string;
  run_number: number;
  run_id: number;
  started_at: string;
  completed_at: string | null;
  duration_seconds: number | null;
  html_url: string;
}

// ============================================================================
// Query Log Types
// ============================================================================

/**
 * API query log entry
 */
export interface QueryLog {
  id: string;
  api_key_id: string | null;
  api_key_name: string | null;
  endpoint: string;
  method: string;
  query_params: Record<string, unknown> | null;
  response_code: number;
  result_count: number | null;
  latency_ms: number;
  error_message: string | null;
  created_at: string;
}

// ============================================================================
// Subscription Types (Agent Subscriptions)
// ============================================================================

/**
 * Agent subscription configuration
 */
export interface AgentSubscription {
  id: string;
  agent_id: string;
  agent_name: string;
  events: string[];
  filters: Record<string, unknown>;
  delivery_mode: 'push' | 'poll';
  delivery_url: string | null;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Agent subscription create request
 */
export interface AgentSubscriptionCreateRequest {
  agent_id: string;
  agent_name: string;
  events: string[];
  filters?: Record<string, unknown>;
  delivery_mode: 'push' | 'poll';
  delivery_url?: string;
}

// ============================================================================
// Filter and Param Types
// ============================================================================

/**
 * Security alert filter params
 */
export interface SecurityAlertFilters {
  repository?: string;
  state?: string;
  severity?: string;
  ecosystem?: string;
  limit?: number;
  offset?: number;
}

/**
 * Triage request for security advisory
 */
export interface TriageRequest {
  status: 'not_applicable' | 'resolved';
  reason?: string;
  notes?: string;
}
