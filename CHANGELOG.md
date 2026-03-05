# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-03-05

### Added

#### Security APIs
- **Security Dashboard API** - `/api/v1/security/*`
  - `security.getRemediationQueue()` - Top 20 critical/high priority alerts across all security types
  - `security.getRepositories()` - Repository risk levels with alert counts
  - `security.getBadgeCounts()` - Overall security metrics and badge counts

- **Dependabot Alerts API** - `/api/v1/dependabot-alerts/*`
  - `dependabotAlerts.list()` - List alerts with filters (repository, state, severity, ecosystem)
  - `dependabotAlerts.get(id)` - Get alert details by ID
  - `dependabotAlerts.stats()` - Alert statistics by state and severity
  - `dependabotAlerts.export()` - Export alerts to CSV (max 10,000 records)

- **Code Scanning Alerts API** - `/api/v1/code-scanning-alerts/*`
  - `codeScanningAlerts.list()` - List alerts with filters
  - `codeScanningAlerts.get(id)` - Get alert details
  - `codeScanningAlerts.stats()` - Statistics
  - `codeScanningAlerts.export()` - CSV export

- **Secret Scanning Alerts API** - `/api/v1/secret-scanning-alerts/*`
  - `secretScanningAlerts.list()` - List alerts with filters
  - `secretScanningAlerts.get(id)` - Get alert details
  - `secretScanningAlerts.stats()` - Statistics
  - `secretScanningAlerts.export()` - CSV export

- **Security Advisories API** - `/api/v1/security-advisories/*`
  - `securityAdvisories.list()` - List advisories
  - `securityAdvisories.get(id)` - Get advisory details
  - `securityAdvisories.stats()` - Statistics
  - `securityAdvisories.triage(id, request)` - Triage advisory (mark as not_applicable or resolved)

#### Repository Management
- **Repositories API** - `/api/v1/repositories/*`
  - `repositories.list()` - List repositories with optional scan_enabled filter
  - `repositories.get(owner, repo)` - Get repository details
  - `repositories.update(owner, repo, settings)` - Update repository settings (scan_enabled, etc.)
  - `repositories.delete(owner, repo)` - Remove repository from monitoring

#### HTTP Subscribers
- **HTTP Subscribers API** - `/api/v1/http-subscribers/*`
  - `httpSubscribers.list()` - List HTTP webhook subscribers
  - `httpSubscribers.create(request)` - Create subscriber
  - `httpSubscribers.update(id, request)` - Update subscriber
  - `httpSubscribers.delete(id)` - Delete subscriber
  - `httpSubscribers.test(id)` - Test webhook delivery

#### API Key Management
- **API Keys API** - `/api/v1/keys/*`
  - `apiKeys.list()` - List API keys
  - `apiKeys.create(request)` - Create key with scopes, expiration, auto-rotation
  - `apiKeys.update(id, request)` - Update key settings
  - `apiKeys.delete(id)` - Delete key
  - `apiKeys.rotate(id)` - Manually rotate key

#### Audit & Monitoring
- **Audit Logs API** - `/api/v1/audit/*`
  - `audit.list()` - List audit events (all API key usage, config changes)
  - `audit.get(id)` - Get audit event details

- **Health API** - `/api/v1/health/*`
  - `health.status()` - System health check (database, redis, queue)
  - `health.handlers()` - Handler configuration status
  - `health.pendingEvents()` - Queue backlog status

#### Dashboard & Analytics
- **Dashboard API** - `/api/dashboard/*`
  - `dashboard.stats()` - Overview metrics (events, deliveries, subscribers, top repositories)
  - `dashboard.timeSeries(metric, interval)` - Time-series data

- **Pipelines API** - `/api/v1/pipelines/*`
  - `pipelines.list()` - List CI/CD pipeline statuses
  - `pipelines.get(owner, repo)` - Pipeline status by repository

- **Query Logs API** - `/api/v1/query-logs/*`
  - `queryLogs.list()` - Agent query logs (aggregates API usage tracking)

- **Agent Subscriptions API** - `/api/v1/subscriptions/*`
  - `subscriptions.list()` - List agent subscriptions
  - `subscriptions.create(request)` - Create subscription
  - `subscriptions.delete(id)` - Delete subscription

#### Type Definitions
- Added 40+ new TypeScript types:
  - Security: `DependabotAlert`, `CodeScanningAlert`, `SecretScanningAlert`, `SecurityAdvisory`, `RemediationQueueItem`, `RepositoryRiskLevel`, `BadgeCounts`, `AlertStats`
  - Repository: `Repository`, `RepositoryUpdateRequest`
  - HTTP Subscriber: `HttpSubscriber`, `HttpSubscriberCreateRequest`, `HttpSubscriberUpdateRequest`, `HttpSubscriberTestResult`
  - API Key: `ApiKey`, `ApiKeyCreateRequest`, `ApiKeyUpdateRequest`, `ApiKeyRotationResult`
  - Audit: `AuditEvent`
  - Health: `HealthStatus`, `HandlerConfig`, `PendingEvents`
  - Dashboard: `DashboardStats`, `TimeSeriesPoint`
  - Pipeline: `PipelineStatus`
  - Query Log: `QueryLog`
  - Subscription: `AgentSubscription`, `AgentSubscriptionCreateRequest`

### Fixed

- **Breaking:** Removed `aggregates.get(id)` method - endpoint doesn't exist on server
- **Breaking:** Fixed `enrichment.enrich()` path from `/api/aggregates/:id/enrich` to `/api/v1/enrichment/enrich` with body `{aggregate_id}`
- **Breaking:** Fixed `deliveries.list()` path from `/api/deliveries` to `/api/v1/deliveries/all`
- Added `deliveries.stats()` method for delivery statistics

### Changed

- Bumped version to `0.1.0` (from `0.0.1`)
- Updated `X-Client-Version` header to `0.1.0`
- Improved error handling for all new endpoints
- Enhanced TypeScript type coverage to 90%+ of production API

### Migration Guide

#### Breaking Changes

1. **Removed `aggregates.get(id)`**
   ```typescript
   // ❌ Before (doesn't work)
   const aggregate = await client.aggregates.get('some-id');
   
   // ✅ After (use list and filter)
   const aggregates = await client.aggregates.list();
   const aggregate = aggregates.data.find(a => a.entity_id === 'some-id');
   ```

2. **Updated `enrichment.enrich()` signature**
   ```typescript
   // ❌ Before (wrong path)
   await client.enrichment.enrich(aggregateId);
   
   // ✅ After (same signature, corrected path internally)
   await client.enrichment.enrich(aggregateId);
   ```

3. **Updated `deliveries.list()` path**
   ```typescript
   // ✅ No code changes needed (path corrected internally)
   const deliveries = await client.deliveries.list();
   ```

#### New Features

**Security Monitoring**
```typescript
// Get top critical/high alerts for remediation
const queue = await client.security.getRemediationQueue(20);

// Check repository risk levels
const repos = await client.security.getRepositories();

// Get overall security badge counts
const badges = await client.security.getBadgeCounts();

// List dependabot alerts
const alerts = await client.dependabotAlerts.list({
  repository: 'Alteriom/webhook-connector',
  state: 'open',
  severity: 'critical',
  limit: 50,
});

// Export to CSV
const csv = await client.dependabotAlerts.export({ state: 'open' });
```

**Repository Management**
```typescript
// List monitored repositories
const repos = await client.repositories.list({ scan_enabled: true });

// Update repository settings
await client.repositories.update('Alteriom', 'webhook-connector', {
  scan_enabled: true,
});
```

**API Key Management**
```typescript
// Create key with auto-rotation
const { key, secret } = await client.apiKeys.create({
  name: 'Production Key',
  description: 'Main production API key',
  scopes: ['read', 'write'],
  auto_rotate: true,
  rotation_days: 90,
});

// Rotate key manually
const result = await client.apiKeys.rotate(key.id);
console.log('New key:', result.new_key);
```

## [0.0.1] - 2026-02-15

### Added

- Initial release
- Events API (`/api/events`)
- Aggregates API (`/api/v1/aggregates`)
- Enrichment API (`/api/aggregates/:id/enrich`)
- Deliveries API (`/api/deliveries`)
- Subscribers API (`/api/subscribers`)
- Basic TypeScript types
- Rate limiting (100 req/min default)
- Retry logic with exponential backoff
- Request correlation IDs
- Comprehensive error handling

[0.1.0]: https://github.com/Alteriom/webhook-client/compare/v0.0.1...v0.1.0
[0.0.1]: https://github.com/Alteriom/webhook-client/releases/tag/v0.0.1
