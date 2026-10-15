# webhook-client

`@alteriom/webhook-client` on npm: the typed TypeScript client for Alteriom/alteriom-webhook-connector. It has a REST client with retries and rate limiting, a signed-webhook receiver with Express, Fastify and Next.js adapters, a Socket.IO event stream client, and the types and guards for what the connector returns (MIT, CommonJS, Node 22). The connector's own code is in that repository, not here. What leaves this repository is a reviewed pull request or a version on npm.

## Where things live

| Path | What it holds |
|---|---|
| `src/` | the client, receiver, adapters, WebSocket client, types, guards, errors — mapped in [architecture.md](.github/icm/_shared/architecture.md) |
| `tests/` | jest suites, one per area, with axios and Socket.IO mocked |
| `schemas/` | an OpenAPI snapshot from the first release; nothing builds or tests from it |
| `docs/superpowers/` | the design and plan of the WebSocket client |
| `.github/workflows/` | CI (lint, test, build and size, audit), TypeDoc to GitHub Pages, release on a `v*` tag |
| `README.md`, `CONTRIBUTING.md`, `CHANGELOG.md` | usage for every API group; setup, commit format, release; what changed |
| [`.github/icm/_shared/`](.github/icm/_shared/CONTEXT.md) | what every job below draws on, one file per question |
| [`.github/icm/01-fix/`](.github/icm/01-fix/CLAUDE.md) | fix a defect, including a dependency advisory |
| [`.github/icm/02-endpoint/`](.github/icm/02-endpoint/CLAUDE.md) | cover a connector endpoint or event shape the client lacks |
| [`.github/icm/03-release/`](.github/icm/03-release/CLAUDE.md) | release a version to npm; a person pushes the tag |

## Route by what just happened

| Route | If | Go to | Then stop at |
|---|---|---|---|
| triage | an issue arrives and its kind is unclear | read it whole (`gh issue view <n> --comments`) and take the row below that fits | the row chosen, said to the person |
| fix | a defect is reported (issue, failing test, a call that returns or throws the wrong thing) | [01_reproduce](.github/icm/01-fix/stages/01_reproduce/CONTEXT.md) | a person has seen the reproduction fail |
| ci-red | `CI` is red on `main` or on a pull request for a reason not in its diff | [01_reproduce](.github/icm/01-fix/stages/01_reproduce/CONTEXT.md), with the run log as the report | a person has seen the reproduction fail |
| advisory | `npm audit` or a Dependabot alert flags a dependency | [01_reproduce](.github/icm/01-fix/stages/01_reproduce/CONTEXT.md), with the advisory as the report | a person has seen the audit output |
| security | a report may be a vulnerability in this package | report it privately as the contributing guide's "Reporting Vulnerabilities" says, never as a public issue or pull request | the maintainer has the private report |
| endpoint | the connector gained an endpoint, field or event the client should cover | [01_spec](.github/icm/02-endpoint/stages/01_spec/CONTEXT.md) | a person approves the spec |
| fix-to-endpoint | a fix turns out to need a new method or a changed public type | [01_spec](.github/icm/02-endpoint/stages/01_spec/CONTEXT.md), with the fix run's `reproduction.md` as the request | a person approves the spec |
| release | a version is to be released | [01_plan](.github/icm/03-release/stages/01_plan/CONTEXT.md) | a person approves the version number |
| publish-check | a tag was pushed and npm or the GitHub release must be confirmed | [03_publish](.github/icm/03-release/stages/03_publish/CONTEXT.md), from step 2 | a person has seen the version on npm |
| next | a stage's output was approved | the next numbered stage of the same job | a person reads that stage's output |
| status | asked for status | scan `.github/icm/*/stages/*/output/` | report what exists |

## Agents connecting remotely

This repository is to be the ICM workspace `webhook-client` on MemoryRelay. A person creates it from this repository's `main`; the Alteriom hub then delegates to it. Until it exists, and on any clone, an agent needs nothing: this file is the entry, the table above is the route, and the files it links are read directly.

- Once the workspace exists, an agent that is not on a clone reaches the same files over MCP at `https://api.memoryrelay.net/mcp` and starts with `icm_context_build` for the route that fits (`{kind: "route", id: "fix"}`), not with the whole repository.
- Report what you read with `icm_report_reads` when a stage ends, and what the task came to with `icm_report_outcome`.
- Never write through MCP: a change is a branch and a pull request here, read and merged by a person.

## Rules

- Nothing moves to the next stage until a person has read the output of the last one.
- A stage writes to its own `output/`, which is not committed: one run per worktree or branch, and clear that job's `stages/*/output/` when its pull request merges or is abandoned.
- A job reads only its own run's output; moving to another job is a route above, started by the person.
- No agent pushes a tag or publishes: a `v*` tag publishes to npm, and a person pushes it.
- This repository is public, and the connector it talks to is private: no host, credential or connector internals go into a file here.
- `.github/icm/` points at the files that own each fact. When they disagree, the owning file is right: correct `.github/icm/` in the same pull request, and bump its `verified_commit`.
