# Issue 3: Update client library to match current API paths

## Summary
The `@alteriom/webhook-client` package uses incorrect API paths (`/api/v1/*`) that don't match the deployed connector (`/api/*`).

## Current State
**Client code:**
```typescript
// src/api-client.ts
const eventsUrl = `${baseURL}/api/v1/events`;  // 404
const aggregatesUrl = `${baseURL}/api/v1/aggregates`;  // 404
```

**Actual API:**
- ✅ Working: `/api/events`, `/api/subscribers`
- ❌ Broken: `/api/aggregates` (returns HTML - see issue #2)

## Proposed Fix

### Short-term: Update client to use current paths
```typescript
// src/api-client.ts
- const eventsUrl = `${baseURL}/api/v1/events`;
+ const eventsUrl = `${baseURL}/api/events`;
```

### Long-term: Support version negotiation
```typescript
constructor(config: {
  baseURL: string;
  apiKey: string;
  apiVersion?: 'v1' | 'v2';  // Default: detect from /api/version
}) {
  this.apiVersion = config.apiVersion || await this.detectVersion();
  this.basePath = `/api${this.apiVersion ? '/' + this.apiVersion : ''}`;
}
```

## Files to Update
- `src/api-client.ts` - Main API client paths
- `src/resources/events.ts` - Events endpoint
- `src/resources/aggregates.ts` - Aggregates endpoint
- `src/resources/enrichment.ts` - Enrichment endpoint
- `src/resources/subscribers.ts` - Subscribers endpoint
- `tests/**/*.test.ts` - Update test URLs
- `README.md` - Update examples

## Testing Checklist
- [ ] `npm test` passes
- [ ] Integration test against live API
- [ ] Examples in README work
- [ ] TypeScript types still match responses

## Migration Notes
If we add v1 routing on the connector side (issue #1), we can support both:
```typescript
// Auto-detect and prefer versioned endpoint
const version = await fetch(`${baseURL}/api/version`).then(r => r.json());
this.apiPath = version.current ? `/api/${version.current}` : '/api';
```

## Priority
**High** - Blocking client adoption

## Related Issues
- #1 (Add v2 API endpoints) - Coordinate path changes

## Labels
bug, client, breaking-change
