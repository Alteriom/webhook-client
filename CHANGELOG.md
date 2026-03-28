# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2026-03-28

### Added
- **TypedAggregate** discriminated union — each `aggregate_type` value now carries a narrowed `summary` shape (22 types total: `workflow_run`, `workflow_job`, `pull_request`, `push`, `issues`, `issue_comment`, `create`, `delete`, `deployment`, `deployment_status`, `release`, `check_run`, `check_suite`, `status`, `page_build`, `public`, `member`, `fork`, `watch`, `gollum`, `discussion`, `discussion_comment`)
- **Typed summary shapes** — `WorkflowRunSummary`, `WorkflowJobSummary`, `PullRequestSummary`, etc. per aggregate type for full TypeScript narrowing
- **New `AggregateListParams` filters** for command center integration:
  - `branch` — filter by branch name (e.g. `'main'`, `'feature/*'`)
  - `conclusion` — filter by workflow conclusion (`'success'`, `'failure'`, `'cancelled'`, etc.)
  - `workflow_name` — filter by workflow display name
- **`response_body` field** added to `HttpSubscriberTestResult` — raw response body from test delivery

### Signals API Stability
This release stabilises the aggregates API for command center integration. The `TypedAggregate` union, typed summary shapes, and new filter params are the foundation for building dashboards and automation on top of the webhook event stream.

### Breaking Changes
- None (backwards compatible — existing code using `aggregate_type: string` continues to work)

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

[1.0.0]: https://github.com/Alteriom/webhook-client/compare/v0.2.0...v1.0.0
[0.2.0]: https://github.com/Alteriom/webhook-client/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/Alteriom/webhook-client/releases/tag/v0.1.0
