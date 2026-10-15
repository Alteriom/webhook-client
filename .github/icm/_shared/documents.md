---
verified_at: 2026-10-15
verified_commit: 3e2e8fea5fa683a579f72427e93fc1a355458d1b
---

# Documents — what this repository has, and what disagrees with the code

The agent-facing files are the root `AGENTS.md` (the entry) and this `.github/icm/` folder. The documents below are for people; each restates facts that the code or a workflow owns, and the owner is right when they disagree.

## The documents

None is pinned as a workspace node: `README.md` and the WebSocket design and plan name the service's host, and `CONTRIBUTING.md` carries contact addresses, and the workspace serves pinned files to every reader. An agent on a clone reads them by path; the facts in this folder point at the sections that matter.

| Document | What it answers | Owner of the facts |
|---|---|---|
| `README.md` | install, quick start, every API group with an example, the receiver, types and guards, errors | `src/client.ts`, `src/receiver.ts`, `src/types.ts` |
| `CONTRIBUTING.md` | setup, commit format and version bumps, PR process, code style, testing, JSDoc, release, vulnerability reports | `package.json`, `jest.config.js`, `.github/workflows/release.yml` |
| `CHANGELOG.md` | what changed per version | the tags and the merged pull requests |
| `docs/superpowers/specs/2026-03-28-websocket-client-design.md`, `docs/superpowers/plans/2026-03-28-websocket-client.md` | why the WebSocket client is shaped as it is, and how it was built | `src/ws-client.ts`, `src/ws-types.ts` |

## Known drift

Each of these disagrees with its owner at the commit above; the owner is right, and a correction is its own pull request.

| Where | What it says | What is true, and where |
|---|---|---|
| `CONTRIBUTING.md` "Coverage Requirements" | a 90% minimum | the enforced floor is `coverageThreshold` in `jest.config.js:11`, well below that |
| `CHANGELOG.md` | ends at 1.1.0, with only the WebSocket client in it | `v1.1.0` also shipped AgentSubscriptions and `v1.2.0` exists ([gotchas.md](gotchas.md) "The changelog lags the tags") |
| `src/index.ts` header comment | `@version 0.0.1` | the version is `package.json:3` |
| `schemas/openapi.json` | the service's API | a snapshot from the first commit, covering a fraction of what `src/client.ts` calls; nothing reads it |
| `.eslintrc.json` | lint rules | ESLint 9 reads the flat config `eslint.config.js` only |
