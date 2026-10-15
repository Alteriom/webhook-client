---
verified_at: 2026-10-15
verified_commit: b26bdab7b9141efa6a7dd266b41ca54d1b95de1e
---

# Gotchas — traps already in the code or the history

## The optional peer is loaded on `connect()`

`socket.io-client` is an optional peer (`package.json:46`): `src/ws-client.ts` imports only its types and `require`s it on the first `WebSocketClient#connect()`, throwing an error that says to install it when it is missing. Keep it that way: a top-level runtime import in any module the package root re-exports (`src/index.ts:126`) makes `require('@alteriom/webhook-client')` fail with `MODULE_NOT_FOUND` for REST-only consumers, as it did before #17. Every other suite runs with the peer installed as a devDependency; `tests/optional-peer.test.ts` is the one that hides it.

## Tags pushed before the merge

`v1.1.0` and `v1.2.0` point at feature-branch commits, not at the squash merges on `main` (`git log -1 v1.2.0` against `git log origin/main`). The package was built from the branch, and `main` holds a different commit with the same version. The tag goes on `main` after the merge ([release.md](release.md)).

## The changelog lags the tags

`CHANGELOG.md` stops at `[1.1.0]` and lists only the WebSocket client there, while the `v1.1.0` tag also carries the AgentSubscriptions client (#11), and `v1.2.0` (#12, the `poll()` helper) has no section. Since `v1.2.0`: test coverage (#13), lockfile-only advisory fixes (#14; the lockfile does not ship, consumers resolve `package.json`'s ranges), the README (#15), and #17's lazy load of the optional peer, which is the first `src/` change and is recorded under `[Unreleased]` in `CHANGELOG.md`.

## Audit at moderate fails CI

`npm audit --audit-level=moderate` (`.github/workflows/ci.yml:107`) fails CI on a moderate advisory anywhere in the tree, including devDependencies. There is no Dependabot version-update configuration, so advisories arrive as alerts and are fixed by hand in one pull request (#14 cleared forty; #17 moved to jest 30 and added the `overrides` entry for `js-yaml` under `@istanbuljs/load-nyc-config`, `package.json` "overrides"). An advisory with no patched release is pinned by an override, not by a range.

## Paths and versions on the wire

Every REST method sends the `X-API-Version` header set in the constructor (`src/client.ts:229`); some groups call versioned paths and some do not, and #4 then #5 moved them twice to match the service. A path is copied from what the service documents, and the test asserts it.
