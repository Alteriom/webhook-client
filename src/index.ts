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
  // Core types
  WebhookEvent,
  EventAggregate,
  Enrichment,
  SubscriptionDelivery,
  Subscriber,
  Delivery,
  ApiError as IApiError,
  ValidationError as IValidationError,
  RateLimitError as IRateLimitError,
  // Aggregate types
  AggregateType,
  AggregateListParams,
  AggregateStatsResponse,
  TypedAggregate,
  WorkflowRunSummary,
  WorkflowJobSummary,
  PullRequestSummary,
  IssueSummary,
  ReleaseSummary,
  DeploymentSummary,
  CheckRunSummary,
  CheckSuiteSummary,
  BranchActivitySummary,
  EmailDeliverySummary,
  SecurityAdvisorySummary,
  CodeScanningAlertSummary,
  DependabotAlertSummary,
  RegistryPackageSummary,
  RefActivitySummary,
  ProjectItemSummary,
  LabelActivitySummary,
  CommitStatusSummary,
  RepositoryConfigSummary,
  WorkflowDispatchSummary,
  // Security types
  DependabotAlert,
  CodeScanningAlert,
  SecretScanningAlert,
  SecurityAdvisory,
  SecurityVulnerability,
  RemediationQueueItem,
  RepositoryRiskLevel,
  BadgeCounts,
  AlertStats,
  SecurityAlertFilters,
  TriageRequest,
  // Repository types
  Repository,
  RepositoryUpdateRequest,
  // HTTP Subscriber types
  HttpSubscriber,
  HttpSubscriberCreateRequest,
  HttpSubscriberUpdateRequest,
  HttpSubscriberTestResult,
  // API Key types
  ApiKey,
  ApiKeyCreateRequest,
  ApiKeyUpdateRequest,
  ApiKeyRotationResult,
  // Audit types
  AuditEvent,
  // Health types
  HealthStatus,
  HandlerConfig,
  PendingEvents,
  // Dashboard types
  DashboardStats,
  TimeSeriesPoint,
  // Pipeline types
  PipelineStatus,
  // Query Log types
  QueryLog,
  // Subscription types
  AgentSubscription,
  AgentSubscriptionCreateRequest,
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

// Export WebSocket client
export { WebSocketClient } from './ws-client';
export type {
  WebSocketClientConfig,
  WebhookEventPayload,
  WebSocketEventMap,
} from './ws-types';
