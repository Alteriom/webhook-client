---
verified_at: 2026-10-15
verified_commit: 3e2e8fea5fa683a579f72427e93fc1a355458d1b
---

# Gotchas — traps already in the code or the history

## The optional peer is loaded by the package root

`socket.io-client` is declared an optional peer (`package.json:46`, and `README.md` "WebSocket Features" says REST-only consumers do not need it), but `src/index.ts:126` re-exports `WebSocketClient`, whose module imports `socket.io-client` at the top (`src/ws-client.ts:1`). The CommonJS build therefore requires it as soon as the package root is loaded: `require('@alteriom/webhook-client')` with only `axios` and `zod` installed fails with `MODULE_NOT_FOUND` for `socket.io-client` (reproduced 2026-10-15 against a build of this commit). Every test runs with it installed as a devDependency, so nothing here catches it.

## Tags pushed before the merge

`v1.1.0` and `v1.2.0` point at feature-branch commits, not at the squash merges on `main` (`git log -1 v1.2.0` against `git log origin/main`). The package was built from the branch, and `main` holds a different commit with the same version. The tag goes on `main` after the merge ([release.md](release.md)).

## The changelog lags the tags

`CHANGELOG.md` stops at `[1.1.0]` and lists only the WebSocket client there, while the `v1.1.0` tag also carries the AgentSubscriptions client (#11), and `v1.2.0` (#12, the `poll()` helper) has no section. Since `v1.2.0`, `main` has changed no file under `src/`: test coverage (#13), lockfile-only advisory fixes (#14; the lockfile does not ship, consumers resolve `package.json`'s ranges), and the README (#15).

## Audit at moderate fails CI

`npm audit --audit-level=moderate` (`.github/workflows/ci.yml:107`) fails CI on a moderate advisory anywhere in the tree, including devDependencies. There is no Dependabot version-update configuration, so advisories arrive as alerts and are fixed by hand in one pull request (#14 cleared forty).

## Paths and versions on the wire

Every REST method sends the `X-API-Version` header set in the constructor (`src/client.ts:229`); some groups call versioned paths and some do not, and #4 then #5 moved them twice to match the service. A path is copied from what the service documents, and the test asserts it.
