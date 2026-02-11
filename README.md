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

// Get aggregate with enrichment
const aggregate = await client.aggregates.get('aggregate-uuid');
if (aggregate.enrichment) {
  console.log('Risk level:', aggregate.enrichment.risk_level);
  console.log('Complexity:', aggregate.enrichment.complexity);
}
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
