# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2026-03-28

### Added
- **WebSocketClient** — real-time event streaming via Socket.IO wrapper
  - Auto-resubscribe on reconnect (server loses subscription state)
  - Typed `WebhookEventPayload` matching server's `webhook-event` emission
  - Configurable event and repository filters with glob support
  - Lifecycle events: `connected`, `disconnected`, `subscribed`, `error`
  - `updateSubscription()` to change filters without reconnecting
- `socket.io-client` as optional peer dependency (REST-only consumers unaffected)

## [1.0.0] - 2026-03-28

### Added
- **TypedAggregate** discriminated union — each `aggregate_type` value now carries a narrowed `summary` shape (22 types: `workflow_run`, `workflow_job`, `pull_request`, `push`, `issue`, `release`, `deployment`, `deployment_status`, `check_run`, `check_suite`, `branch_activity`, `email_delivery`, `security_advisory`, `code_scanning_alert`, `dependabot_alert`, `registry_package`, `ref_activity`, `project_item`, `label_activity`, `commit_status`, `repository_config`, `workflow_dispatch`)
- **Typed summary shapes** — `WorkflowRunSummary`, `WorkflowJobSummary`, `PullRequestSummary`, etc. per aggregate type for full TypeScript narrowing
- **New `AggregateListParams` filters** for command center integration:
  - `branch` — filter by branch name (e.g. `'main'`, `'feature/*'`)
  - `conclusion` — filter by workflow conclusion (`'success'`, `'failure'`, `'cancelled'`, etc.)
  - `workflow_name` — filter by workflow display name
- **`response_body` field** added to `HttpSubscriberTestResult` — raw response body from test delivery

### Signals API Stability
This release stabilises the aggregates API for command center integration. The `TypedAggregate` union, typed summary shapes, and new filter params are the foundation for building dashboards and automation on top of the webhook event stream.

### Changed
- CI now tests on Node 22 and 24 (dropped 18 and 20)
- Minimum Node version set to 22 in `engines` field
- Resolved all npm audit vulnerabilities (brace-expansion, flatted, handlebars, picomatch)

### Breaking Changes
- Requires Node.js >= 22 (dropped support for 18 and 20)

## [0.2.0] - 2026-03-07

### Added
- **AggregateListParams** interface with comprehensive query parameters:
  - `repository` - Filter by repo (wildcards supported: "North-Relay/*")
  - `aggregate_type` - Filter by event type (workflow_run, workflow_job, etc.)
  - `since` / `until` - Server-side timestamp filtering (ISO 8601)
  - `enriched` - Filter by enrichment status
  - `search` - Search in entity_id/title/summary
  - `sort_by` / `sort_direction` - Custom sorting
  - `cursor` - Cursor-based pagination support
  - `limit` - Max results per page (1-100)
- **AggregateStatsResponse** interface for aggregate statistics
- **aggregates.stats()** method to fetch aggregate statistics
- **PaginatedResponse.cursor** - Expose next page cursor for iteration

### Changed
- **aggregates.list()** now accepts `AggregateListParams` instead of generic `{ page, limit }`
- **PaginatedResponse** now includes optional `cursor` field for cursor-based pagination
- Updated type exports in `src/index.ts` to include new aggregate types

### Performance
- Server-side timestamp filtering reduces bandwidth by ~80%
- Cursor pagination enables handling unlimited events in time window
- No more client-side filtering for timestamps

### Breaking Changes
- None (backwards compatible - old usage still works)

## [0.1.0] - 2026-01-XX

### Added
- Initial release with core webhook client functionality
- Comprehensive type definitions for all API endpoints
- Retry logic with exponential backoff
- Rate limiting support
- Event, delivery, subscriber, security, and repository APIs
- Complete TypeScript type safety

[1.1.0]: https://github.com/Alteriom/webhook-client/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/Alteriom/webhook-client/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/Alteriom/webhook-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Alteriom/webhook-client/releases/tag/v0.1.0
