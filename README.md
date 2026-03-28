# @alteriom/webhook-client

> Type-safe TypeScript client for [Alteriom Webhook Connector](https://github.com/Alteriom/alteriom-webhook-connector)

[![npm version](https://img.shields.io/npm/v/@alteriom/webhook-client)](https://www.npmjs.com/package/@alteriom/webhook-client)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- ✅ **Full TypeScript support** - Auto-generated types from OpenAPI spec
- ✅ **REST API client** - All webhook-connector endpoints with retry logic
- ✅ **Webhook receiver** - Secure HMAC-SHA256 signature verification
- ✅ **Framework adapters** - Express, Fastify, Next.js support
- ✅ **Rate limiting** - Token bucket algorithm (100 req/min default)
- ✅ **Retry logic** - Exponential backoff with Retry-After support
- ✅ **Type guards** - Runtime validation helpers
- ✅ **Error classes** - Typed error responses
- ✅ **Security** - Timing-safe signature comparison, replay prevention

## Installation

\`\`\`bash
npm install @alteriom/webhook-client
\`\`\`

## Quick Start

### API Client

\`\`\`typescript
import { AlteriomWebhookClient } from '@alteriom/webhook-client';

const client = new AlteriomWebhookClient({
  baseURL: 'https://webhook.alteriom.net',
  apiKey: process.env.ALTERIOM_API_KEY!,
});

// List events
const events = await client.events.list({
  event_type: 'pull_request',
  status: 'completed',
});

console.log(`Found ${events.total} events`);

// Get enrichment for an aggregate
const enrichment = await client.enrichment.enrich('aggregate-uuid');
console.log('AI suggestions:', enrichment.suggested_actions);
\`\`\`

### Webhook Receiver (Express)

\`\`\`typescript
import express from 'express';
import { expressReceiver } from '@alteriom/webhook-client';

const app = express();
app.use(express.json());

app.use('/webhook', expressReceiver({
  secret: process.env.WEBHOOK_SECRET!,
  onDelivery: async (delivery) => {
    console.log('Received delivery:', delivery.subscription_id);

    if (delivery.aggregate?.enrichment) {
      // Act on AI suggestions
      for (const action of delivery.aggregate.enrichment.suggested_actions) {
        console.log('Suggested action:', action);
        // Implement autonomous behavior here
      }
    }
  },
  onError: (error) => {
    console.error('Webhook error:', error);
  },
}));

app.listen(3000, () => console.log('Listening on :3000'));
\`\`\`

### Webhook Receiver (Next.js)

\`\`\`typescript
// pages/api/webhook.ts
import { nextjsReceiver } from '@alteriom/webhook-client';

export default nextjsReceiver({
  secret: process.env.WEBHOOK_SECRET!,
  onDelivery: async (delivery) => {
    // Handle webhook delivery
  },
});
\`\`\`

## API Client

### Configuration

\`\`\`typescript
const client = new AlteriomWebhookClient({
  baseURL: 'https://webhook.alteriom.net',
  apiKey: process.env.ALTERIOM_API_KEY!,
  timeout: 30000, // Request timeout (default: 30s)
  retry: {
    maxRetries: 3, // Max retry attempts (default: 3)
    backoffBase: 1000, // Base backoff ms (default: 1000)
    backoffMultiplier: 2, // Backoff multiplier (default: 2)
  },
  rateLimit: {
    maxRequests: 100, // Max requests per window (default: 100)
    perMs: 60000, // Window size in ms (default: 60s)
  },
});
\`\`\`

### Security Dashboard API (NEW in v0.1.0)

Get a comprehensive view of security alerts across all repositories.

\`\`\`typescript
// Get remediation queue (top 20 critical/high alerts)
const queue = await client.security.getRemediationQueue(20);
queue.forEach(alert => {
  console.log(`${alert.type} alert #${alert.alert_number} in ${alert.repository}`);
  console.log(`Severity: ${alert.severity}, Age: ${alert.age_days} days`);
  console.log(`URL: ${alert.html_url}`);
});

// Get repository risk levels
const repos = await client.security.getRepositories();
repos.forEach(repo => {
  console.log(`${repo.repository}: ${repo.risk_level} (score: ${repo.risk_score})`);
  console.log(`  Dependabot: ${repo.alert_counts.dependabot}`);
  console.log(`  Code Scanning: ${repo.alert_counts.code_scanning}`);
  console.log(`  Secret Scanning: ${repo.alert_counts.secret_scanning}`);
});

// Get overall security badge counts
const badges = await client.security.getBadgeCounts();
console.log('Dependabot:', badges.dependabot.total, 'open:', badges.dependabot.open);
console.log('  Critical:', badges.dependabot.by_severity.critical);
console.log('  High:', badges.dependabot.by_severity.high);
\`\`\`

### Dependabot Alerts API (NEW in v0.1.0)

Monitor and manage Dependabot vulnerability alerts.

\`\`\`typescript
// List dependabot alerts with filters
const alerts = await client.dependabotAlerts.list({
  repository: 'Alteriom/webhook-connector',
  state: 'open',
  severity: 'critical',
  ecosystem: 'npm',
  limit: 50,
  offset: 0,
});

console.log(`Found ${alerts.total} alerts`);
alerts.data.forEach(alert => {
  console.log(`${alert.dependency_package}@${alert.vulnerable_version_range}`);
  console.log(`  ${alert.vulnerability_severity}: ${alert.vulnerability_summary}`);
  console.log(`  GHSA: ${alert.vulnerability_ghsa_id}`);
  if (alert.patched_version) {
    console.log(`  Fix: upgrade to ${alert.patched_version}`);
  }
});

// Get single alert details
const alert = await client.dependabotAlerts.get('alert-uuid');

// Get alert statistics
const stats = await client.dependabotAlerts.stats('Alteriom/webhook-connector');
console.log('Total:', stats.total);
console.log('By state:', stats.by_state);
console.log('By severity:', stats.by_severity);

// Export alerts to CSV (max 10,000 records)
const csv = await client.dependabotAlerts.export({
  state: 'open',
  severity: 'high,critical',
});
// Write CSV to file or send to user
\`\`\`

### Code Scanning Alerts API (NEW in v0.1.0)

Manage code scanning security alerts (CodeQL, etc.).

\`\`\`typescript
// List code scanning alerts
const alerts = await client.codeScanningAlerts.list({
  repository: 'Alteriom/webhook-connector',
  state: 'open',
  severity: 'error',
  limit: 50,
});

alerts.data.forEach(alert => {
  console.log(`${alert.rule_id}: ${alert.rule_description}`);
  console.log(`  Tool: ${alert.tool_name} ${alert.tool_version}`);
  console.log(`  Instances: ${alert.instances_count}`);
});

// Get statistics
const stats = await client.codeScanningAlerts.stats();

// Export to CSV
const csv = await client.codeScanningAlerts.export({ state: 'open' });
\`\`\`

### Secret Scanning Alerts API (NEW in v0.1.0)

Monitor exposed secrets in code.

\`\`\`typescript
// List secret scanning alerts
const alerts = await client.secretScanningAlerts.list({
  repository: 'Alteriom/webhook-connector',
  state: 'open',
});

alerts.data.forEach(alert => {
  console.log(`${alert.secret_type_display_name}`);
  console.log(`  Locations: ${alert.locations_count}`);
  console.log(`  Push protection bypassed: ${alert.push_protection_bypassed}`);
});

// Get statistics
const stats = await client.secretScanningAlerts.stats();

// Export to CSV
const csv = await client.secretScanningAlerts.export({ state: 'open' });
\`\`\`

### Security Advisories API (NEW in v0.1.0)

Manage GitHub Security Advisories and triage them.

\`\`\`typescript
// List security advisories
const advisories = await client.securityAdvisories.list({
  severity: 'critical',
  limit: 50,
});

advisories.data.forEach(advisory => {
  console.log(`${advisory.ghsa_id}: ${advisory.summary}`);
  console.log(`  Severity: ${advisory.severity} (CVSS: ${advisory.cvss_score})`);
  console.log(`  Affected repos: ${advisory.affected_repositories.length}`);
  console.log(`  Triage status: ${advisory.triage_status}`);
});

// Get single advisory
const advisory = await client.securityAdvisories.get('advisory-uuid');

// Triage advisory (mark as not applicable or resolved)
await client.securityAdvisories.triage('advisory-uuid', {
  status: 'not_applicable',
  reason: 'Package not used in production',
  notes: 'Only dev dependency, not exposed',
});

// Get statistics
const stats = await client.securityAdvisories.stats();
\`\`\`

### Repositories API (NEW in v0.1.0)

Manage repository monitoring settings.

\`\`\`typescript
// List all repositories
const repos = await client.repositories.list();

// List only monitored repositories
const monitored = await client.repositories.list({ scan_enabled: true });

// Get repository details
const repo = await client.repositories.get('Alteriom', 'webhook-connector');
console.log('Scan enabled:', repo.scan_enabled);
console.log('Language:', repo.language);
console.log('Topics:', repo.topics);

// Enable security scanning for repository
await client.repositories.update('Alteriom', 'webhook-connector', {
  scan_enabled: true,
});

// Disable security scanning
await client.repositories.update('Alteriom', 'old-repo', {
  scan_enabled: false,
});

// Remove repository from system
await client.repositories.delete('Alteriom', 'archived-repo');
\`\`\`

### HTTP Subscribers API (NEW in v0.1.0)

Manage HTTP webhook subscribers.

\`\`\`typescript
// List HTTP subscribers
const subscribers = await client.httpSubscribers.list();
subscribers.forEach(sub => {
  console.log(`${sub.name}: ${sub.url}`);
  console.log(`  Events: ${sub.events.join(', ')}`);
  console.log(`  Stats: ${sub.delivery_stats.successful_deliveries}/${sub.delivery_stats.total_deliveries} successful`);
});

// Create HTTP subscriber
const subscriber = await client.httpSubscribers.create({
  name: 'Production Webhook',
  url: 'https://api.example.com/webhooks',
  secret: 'my-webhook-secret',
  events: ['dependabot_alert', 'code_scanning_alert'],
  filters: {
    repositories: ['Alteriom/*'],
    severity: ['critical', 'high'],
  },
});

// Update subscriber
await client.httpSubscribers.update(subscriber.id, {
  enabled: false,
});

// Test webhook delivery
const result = await client.httpSubscribers.test(subscriber.id);
if (result.success) {
  console.log(`Test successful: ${result.status_code} in ${result.latency_ms}ms`);
} else {
  console.error(`Test failed: ${result.error}`);
}

// Delete subscriber
await client.httpSubscribers.delete(subscriber.id);
\`\`\`

### API Keys API (NEW in v0.1.0)

Manage API keys with auto-rotation support.

\`\`\`typescript
// List API keys
const keys = await client.apiKeys.list();
keys.forEach(key => {
  console.log(`${key.name} (${key.key_prefix}...)`);
  console.log(`  Scopes: ${key.scopes.join(', ')}`);
  console.log(`  Last used: ${key.last_used_at || 'never'}`);
  console.log(`  Auto-rotate: ${key.auto_rotate} (every ${key.rotation_days} days)`);
});

// Create API key with auto-rotation
const { key, secret } = await client.apiKeys.create({
  name: 'Production Key',
  description: 'Main production API key',
  scopes: ['read', 'write'],
  expires_at: '2027-03-05T00:00:00Z', // Optional expiration
  auto_rotate: true,
  rotation_days: 90, // Rotate every 90 days
});

console.log('New API key:', secret); // Save this securely!

// Update key settings
await client.apiKeys.update(key.id, {
  description: 'Updated description',
  auto_rotate: false,
});

// Manually rotate key
const result = await client.apiKeys.rotate(key.id);
console.log('New key:', result.new_key);
console.log('Expires at:', result.expires_at);

// Deactivate key
await client.apiKeys.update(key.id, { active: false });

// Delete key
await client.apiKeys.delete(key.id);
\`\`\`

### Audit Logs API (NEW in v0.1.0)

Track all API key usage and configuration changes.

\`\`\`typescript
// List audit events
const logs = await client.audit.list({ limit: 50, offset: 0 });
logs.data.forEach(event => {
  console.log(`[${event.created_at}] ${event.actor} ${event.action} ${event.resource_type}`);
  console.log(`  Details:`, event.details);
});

// Get single audit event
const event = await client.audit.get('event-uuid');
\`\`\`

### Health API (NEW in v0.1.0)

Monitor system health and configuration.

\`\`\`typescript
// Get system health status
const health = await client.health.status();
console.log('Status:', health.status); // healthy | degraded | unhealthy
console.log('Uptime:', health.uptime_seconds, 'seconds');
console.log('Checks:', health.checks);

// Get handler configurations
const handlers = await client.health.handlers();
handlers.forEach(handler => {
  console.log(`${handler.event_type}: ${handler.handler_name} (priority: ${handler.priority})`);
});

// Get pending events summary
const pending = await client.health.pendingEvents();
console.log('Total pending:', pending.total);
console.log('By status:', pending.by_status);
console.log('Oldest pending:', pending.oldest_pending_at);
\`\`\`

### Dashboard API (NEW in v0.1.0)

Get dashboard metrics and time-series data.

\`\`\`typescript
// Get dashboard statistics
const stats = await client.dashboard.stats();
console.log('Total events:', stats.total_events);
console.log('Total deliveries:', stats.total_deliveries);
console.log('Active subscribers:', stats.active_subscribers);
console.log('Delivery success rate:', stats.delivery_success_rate * 100, '%');
console.log('Avg latency:', stats.avg_latency_ms, 'ms');

// Top repositories
stats.top_repositories.forEach(repo => {
  console.log(`${repo.repository}: ${repo.event_count} events`);
});

// Get time-series data
const timeseries = await client.dashboard.timeSeries('events', '1h');
timeseries.forEach(point => {
  console.log(`${point.timestamp}: ${point.value}`);
});
\`\`\`

### Pipelines API (NEW in v0.1.0)

Monitor CI/CD pipeline statuses.

\`\`\`typescript
// List all pipeline statuses
const pipelines = await client.pipelines.list();

// List pipelines for specific repository
const repoPipelines = await client.pipelines.list('Alteriom/webhook-connector');

repoPipelines.forEach(pipeline => {
  console.log(`${pipeline.workflow_name} #${pipeline.run_number}: ${pipeline.status}`);
  console.log(`  Branch: ${pipeline.branch}`);
  console.log(`  Commit: ${pipeline.commit_sha.slice(0, 7)} - ${pipeline.commit_message}`);
  console.log(`  Duration: ${pipeline.duration_seconds}s`);
});

// Get pipelines for owner/repo
const specific = await client.pipelines.get('Alteriom', 'webhook-connector');
\`\`\`

### Query Logs API (NEW in v0.1.0)

Track API usage and query logs.

\`\`\`typescript
// List query logs
const logs = await client.queryLogs.list({ limit: 50, offset: 0 });
logs.data.forEach(log => {
  console.log(`[${log.created_at}] ${log.method} ${log.endpoint}`);
  console.log(`  API Key: ${log.api_key_name}`);
  console.log(`  Response: ${log.response_code} (${log.latency_ms}ms)`);
  console.log(`  Results: ${log.result_count}`);
});
\`\`\`

### Agent Subscriptions API (NEW in v0.1.0)

Manage agent event subscriptions.

\`\`\`typescript
// List agent subscriptions
const subscriptions = await client.subscriptions.list();
subscriptions.forEach(sub => {
  console.log(`${sub.agent_name} (${sub.agent_id})`);
  console.log(`  Events: ${sub.events.join(', ')}`);
  console.log(`  Delivery: ${sub.delivery_mode}`);
});

// Create agent subscription
const subscription = await client.subscriptions.create({
  agent_id: 'jarvis',
  agent_name: 'Jarvis AI Agent',
  events: ['workflow_run', 'deployment'],
  filters: {
    repositories: ['North-Relay/*'],
    conclusion: ['success', 'failure'],
  },
  delivery_mode: 'push',
  delivery_url: 'https://jarvis.example.com/webhook',
});

// Delete subscription
await client.subscriptions.delete(subscription.id);
\`\`\`

### Events API

\`\`\`typescript
// List events with filters
const events = await client.events.list({
  page: 1,
  limit: 50,
  event_type: 'pull_request',
  status: 'completed',
  repository: 'Alteriom/*',
  sender: 'sparck75',
  search: 'github_delivery_id',
  from: '2026-02-01T00:00:00Z',
  to: '2026-02-11T23:59:59Z',
});

// Get single event
const event = await client.events.get('event-uuid');
\`\`\`

### Aggregates API

\`\`\`typescript
// List aggregates
const aggregates = await client.aggregates.list({ page: 1, limit: 50 });

// Note: aggregates.get(id) removed in v0.1.0 - endpoint doesn't exist
// Use list and filter instead
const aggregate = aggregates.data.find(a => a.entity_id === 'some-id');
\`\`\`

### TypedAggregate — Type Narrowing (NEW in v1.0.0)

`aggregate_type` is now a union of 22 literal types instead of `string`. TypeScript narrows the `summary` shape automatically based on the type discriminant, giving you full type safety on aggregate data.

\`\`\`typescript
const { data } = await client.aggregates.list({
  aggregate_type: 'workflow_run',
  branch: 'main',
  conclusion: 'failure',
  limit: 5,
});

for (const agg of data) {
  // TypeScript narrows summary type based on aggregate_type
  if (agg.aggregate_type === 'workflow_run') {
    console.log(`${agg.summary.workflow_name} failed on ${agg.summary.branch}`);
  }
}
\`\`\`

New filter parameters for `aggregates.list()`:

| Param | Type | Description |
|-------|------|-------------|
| `branch` | `string` | Filter by branch name (e.g. `'main'`, `'feature/*'`) |
| `conclusion` | `string` | Filter by workflow conclusion (`'success'`, `'failure'`, `'cancelled'`, etc.) |
| `workflow_name` | `string` | Filter by workflow display name |

### Python HMAC Signature Verification

For teams integrating the webhook server from Python without a dedicated SDK:

\`\`\`python
import hmac, hashlib, time

def verify_signature(body: bytes, signature: str, timestamp: str, secret: str, tolerance: int = 300) -> bool:
    age = abs(int(time.time()) - int(timestamp))
    if age > tolerance:
        return False
    data = f'{timestamp}.{body.decode()}'
    expected = 'sha256=' + hmac.new(secret.encode(), data.encode(), hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature)
\`\`\`

### Enrichment API

\`\`\`typescript
// Trigger AI enrichment (GPT-4 analysis)
const enrichment = await client.enrichment.enrich('aggregate-uuid');

console.log('Summary:', enrichment.summary);
console.log('Risk:', enrichment.risk_level);
console.log('Security concerns:', enrichment.security_concerns);
console.log('Suggested actions:', enrichment.suggested_actions);
console.log('Cost:', `$${enrichment.cost_usd?.toFixed(4)}`);
\`\`\`

### Deliveries API

\`\`\`typescript
// List deliveries
const deliveries = await client.deliveries.list({ limit: 50 });

// Get delivery statistics
const stats = await client.deliveries.stats();
\`\`\`

### Subscribers API

\`\`\`typescript
// List subscriptions
const subscribers = await client.subscribers.list();

// Create subscription
const subscription = await client.subscribers.create({
  name: 'my-agent',
  url: 'https://my-agent.com/webhook',
  secret: 'my-webhook-secret',
  events: ['pull_request', 'issues'],
  filters: {
    repositories: ['Alteriom/*'],
    senders: ['sparck75'],
  },
});

// Update subscription
await client.subscribers.update('sub-uuid', {
  enabled: false,
});

// Delete subscription
await client.subscribers.delete('sub-uuid');
\`\`\`

## Webhook Receiver

### Security Features

✅ **HMAC-SHA256 Signature Verification** - Timing-safe comparison  
✅ **Replay Attack Prevention** - Reject webhooks older than 5 minutes  
✅ **Duplicate Detection** - Cache processed deliveries for 1 hour  
✅ **Payload Size Limit** - Reject payloads > 10 MB  

### Configuration

\`\`\`typescript
const receiver = webhookReceiver({
  secret: process.env.WEBHOOK_SECRET!, // Required
  onDelivery: async (delivery) => { /* ... */ }, // Required
  onSuccess: (delivery) => { /* Optional */ },
  onError: (error) => { /* Optional */ },
  maxAge: 300000, // Max webhook age in ms (default: 5 min)
  maxPayloadSize: 10 * 1024 * 1024, // Max payload bytes (default: 10 MB)
  skipVerification: false, // Skip signature check (dev only)
  logger: console, // Optional logger (debug, error methods)
});
\`\`\`

### Testing Webhooks

Use `generateWebhookSignature()` to create valid test requests:

\`\`\`typescript
import { generateWebhookSignature } from '@alteriom/webhook-client';

const payload = {
  subscription_id: 'test-sub',
  delivery_mode: 'aggregate',
  aggregate: { /* ... */ },
  delivered_at: new Date().toISOString(),
};

const { signature, timestamp } = generateWebhookSignature(
  payload,
  'my-webhook-secret'
);

// Send test request
await fetch('http://localhost:3000/webhook', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Connector-Signature-256': signature,
    'X-Connector-Timestamp': timestamp,
  },
  body: JSON.stringify(payload),
});
\`\`\`

## TypeScript Types

All types are exported from the main entry point:

\`\`\`typescript
import type {
  WebhookEvent,
  EventAggregate,
  Enrichment,
  SubscriptionDelivery,
  Subscriber,
  Delivery,
  EventStatus,
  RiskLevel,
  DeliveryStatus,
} from '@alteriom/webhook-client';
\`\`\`

### Type Guards

Runtime validation helpers:

\`\`\`typescript
import { isEnrichment, isSubscriptionDelivery } from '@alteriom/webhook-client';

if (isEnrichment(obj)) {
  // obj is typed as Enrichment
  console.log(obj.suggested_actions);
}

if (isSubscriptionDelivery(obj)) {
  // obj is typed as SubscriptionDelivery
  console.log(obj.aggregate.enrichment);
}
\`\`\`

## Error Handling

\`\`\`typescript
import {
  ApiError,
  RateLimitError,
  ValidationError,
  SignatureVerificationError,
  WebhookExpiredError,
} from '@alteriom/webhook-client';

try {
  const events = await client.events.list();
} catch (error) {
  if (error instanceof RateLimitError) {
    console.log(`Rate limited. Retry after ${error.retryAfter}s`);
    console.log(`Limit: ${error.limit}, Remaining: ${error.remaining}`);
  } else if (error instanceof ApiError) {
    console.log(`API error: ${error.message} (status: ${error.status})`);
    console.log('Details:', error.details);
  }
}
\`\`\`

## Examples

See the `examples/` directory for complete working examples:

- **Express.js** - Simple webhook receiver
- **Fastify** - High-performance webhook receiver
- **Next.js** - API route webhook handler
- **Friday Agent** - Full OpenClaw agent integration

## Migration Guide

### Before (Manual Implementation)

\`\`\`typescript
// 200+ lines of manual webhook handling
import express from 'express';
import crypto from 'crypto';

const app = express();

app.post('/webhook', (req, res) => {
  // Manual signature verification (20 lines)
  // Manual timestamp validation (10 lines)
  // Manual error handling (30 lines)
  // Manual type casting (unsafe)
  // Process webhook (90 lines)
  
  res.status(200).send('ok');
});
\`\`\`

### After (With Package)

\`\`\`typescript
// 10 lines total
import express from 'express';
import { expressReceiver } from '@alteriom/webhook-client';

const app = express();

app.use('/webhook', expressReceiver({
  secret: process.env.WEBHOOK_SECRET!,
  onDelivery: async (delivery) => {
    // Type-safe, secure, validated ✅
  },
}));
\`\`\`

**Reduction:** 200+ lines → 10 lines (95% less code)

## Development

\`\`\`bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test

# Run linter
npm run lint
\`\`\`

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT © [Alteriom](https://github.com/Alteriom)

## Links

- **Documentation:** [https://docs.alteriom.net](https://docs.alteriom.net)
- **GitHub:** [https://github.com/Alteriom/webhook-client](https://github.com/Alteriom/webhook-client)
- **NPM:** [https://www.npmjs.com/package/@alteriom/webhook-client](https://www.npmjs.com/package/@alteriom/webhook-client)
- **Webhook Connector:** [https://github.com/Alteriom/alteriom-webhook-connector](https://github.com/Alteriom/alteriom-webhook-connector)

## Support

- **Issues:** [GitHub Issues](https://github.com/Alteriom/webhook-client/issues)
- **Discord:** [OpenClaw Community](https://discord.gg/clawd)

---

**Built for [OpenClaw](https://openclaw.ai) agents** 🐾
