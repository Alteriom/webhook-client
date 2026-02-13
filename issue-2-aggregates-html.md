# Issue 2: Fix aggregates endpoint returning HTML

## Summary
The `/api/aggregates` endpoint returns HTML (the frontend app) instead of JSON, making it unusable for API clients.

## Current Behavior
```bash
$ curl -H "Authorization: Bearer $API_KEY" https://webhook.alteriom.net/api/aggregates
<!doctype html>
<html lang="en">
...
```

## Expected Behavior
```json
{
  "aggregates": [...],
  "total": 123,
  "limit": 20,
  "offset": 0
}
```

## Root Cause
Likely routing issue where `/api/aggregates` is falling through to the frontend catch-all route instead of hitting the API handler.

## Reproduction
```javascript
const res = await fetch('https://webhook.alteriom.net/api/aggregates', {
  headers: { 'Authorization': 'Bearer YOUR_API_KEY' }
});
const data = await res.json(); // Error: Unexpected token '<'
```

## Investigation Needed
1. Check Express/Fastify route order (API routes must come before `app.use('*', frontend)`)
2. Verify aggregates route is registered: `app.get('/api/aggregates', handler)`
3. Check if path is missing from router exports

## Impact
- **Severity**: High
- **Affected**: All API clients trying to list aggregates
- **Workaround**: None currently

## Priority
**Critical** - Core API endpoint non-functional

## Labels
bug, api, routing
