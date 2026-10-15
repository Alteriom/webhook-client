---
verified_at: 2026-10-15
verified_commit: b26bdab7b9141efa6a7dd266b41ca54d1b95de1e
---

# Build and test — the commands, and what CI runs

## Locally

- `npm ci`, then `npm test` (jest with ts-jest, `jest.config.js`; no build needed), `npm run lint` (ESLint 9 flat config `eslint.config.js` over `src/`; warnings for `any` are allowed, errors fail), `npm run build` (`tsc` into `dist/`). Scripts: `package.json:16` to `package.json:22`. Node 22 or later (`package.json:5`).
- Coverage: `npm test -- --coverage`; the floor is `coverageThreshold` in `jest.config.js` (`jest.config.js:11`), and `src/index.ts` is excluded from it.
- `npm pack --dry-run` lists what would ship (`package.json:10`).

## Where a test belongs

One suite per area in `tests/`: REST groups and their paths in `tests/client.test.ts` (and the security, repository, HTTP-subscriber and API-key groups in `tests/security.test.ts`); signing and the receiver in `tests/receiver.test.ts`; type narrowing in `tests/types.test.ts`; the stream in `tests/ws-client.test.ts`; loading the package root without the optional peer in `tests/optional-peer.test.ts`. REST tests mock `axios.create` and assert the method, path and body sent (`tests/client.test.ts` "Endpoint Path Verification"); no test reaches a network. The Arrange/Act/Assert shape and JSDoc rules are `CONTRIBUTING.md` "Testing Guidelines" and "Documentation".

## What CI runs

`ci.yml` on pull requests to `main` and pushes to `main`: lint; tests with coverage on Node 22; build, a 110 KB limit on `dist/` (`.github/workflows/ci.yml:77`) and `npm pack`; `npm audit --audit-level=moderate` (`.github/workflows/ci.yml:107`), so a moderate advisory anywhere in the tree fails CI; TruffleHog, which may fail without failing the job. `docs.yml` publishes TypeDoc to GitHub Pages on pushes to `main` that touch `src/` or `README.md`. `icm-check.yml` runs when an entry file or `.github/icm/` changes.
