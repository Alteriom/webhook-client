# Issue 1: Add v2 API endpoints

## Summary
The webhook client library expects `/api/v1/*` paths but the connector currently serves at `/api/*`. We need to implement versioned API endpoints to support both current clients and future breaking changes.

## Current State
- Client code uses: `/api/v1/events`, `/api/v1/aggregates`, `/api/v1/subscribers`
- Connector serves: `/api/events`, `/api/aggregates`, `/api/subscribers`
- Result: 404 errors when using the client library

## Proposed Solution

### Option 1: Add v1 prefix to current endpoints (backwards compatible)
```typescript
// Keep existing paths working
app.get('/api/events', handler);          // Legacy
app.get('/api/v1/events', handler);        // New (same handler)

// Future v2 can coexist
app.get('/api/v2/events', newHandler);
```

### Option 2: Redirect /api/v1 to current implementation
```typescript
app.use('/api/v1', apiRouter);  // Points to current /api/*
```

### Option 3: Make v1 the default, keep legacy for migration
```typescript
app.use('/api/v1', apiRouter);     // Primary
app.use('/api', apiRouter);        // Deprecated, warn in logs
```

## Affected Endpoints
- `/api/events` → `/api/v1/events`
- `/api/aggregates` → `/api/v1/aggregates`
- `/api/subscribers` → `/api/v1/subscribers`
- `/api/enrichment/:id` → `/api/v1/enrichment/:id`

## Testing
- Verify client library connects successfully
- Ensure backwards compatibility for existing integrations
- Add versioning headers: `X-API-Version: 1.0`

## Priority
**High** - Blocking client adoption

## Labels
enhancement, api, versioning
