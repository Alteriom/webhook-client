---
verified_at: 2026-10-15
verified_commit: b26bdab7b9141efa6a7dd266b41ca54d1b95de1e
---

# Architecture — where each part of the client lives

## The REST client

- `src/client.ts:216` `AlteriomWebhookClient`: one axios instance created with the caller's `baseURL` and a bearer API key (`src/client.ts:221`; the options are `ClientConfig`, `src/client.ts:70`), interceptors at `src/client.ts:247`.
- Every call passes through a token-bucket `RateLimiter` (`src/client.ts:88`) and `RetryLogic` (`src/client.ts:132`): exponential backoff, no retry on a 4xx except 429, which honours `retry-after`. Failures become the error classes of `src/errors.ts` (`createApiError`, `src/client.ts:188`).
- The API is grouped as `public readonly <group> = { ... }` objects, one per connector area (`events` at `src/client.ts:283` through `subscriptions` at `src/client.ts:1169`). Each method is `await this.rateLimiter.acquire()` then `this.retryLogic.execute(...)` around one `this.http` call; `agentSubscriptions` (`src/client.ts:821`) is a recent, complete example.
- The request and response shapes are `src/types.ts`; `src/guards.ts` holds the runtime type guards and `parseAs`.

## The receiver and the stream

- `src/receiver.ts:98` `webhookReceiver`: the payload size limit, the signature and timestamp headers, the timestamp age check against replay, an HMAC-SHA256 signature compared in constant time (`src/receiver.ts:62`), and a duplicate-delivery cache. `generateWebhookSignature` (`src/receiver.ts:29`) signs test payloads the same way. `src/adapters.ts` wraps it for Express, Fastify and Next.js.
- `src/ws-client.ts` `WebSocketClient` wraps `socket.io-client` (an optional peer dependency, `package.json:46`, loaded on the first `connect()`): connect with the API key, re-subscribe on every reconnect, typed handlers from `src/ws-types.ts`. Its design is `docs/superpowers/specs/2026-03-28-websocket-client-design.md`.

## The package

`src/index.ts` is the export surface: every type, guard and error, the client, the receiver and adapters, and the WebSocket client (`src/index.ts:126`). `tsc` builds CommonJS with declarations into `dist/` (`tsconfig.json`), and only `dist/`, `README.md` and `LICENSE` ship (`package.json:10`). The runtime dependencies are `axios` and `zod` (`package.json:42`); Node 22 or later (`package.json:5`).

## What the client talks to

Alteriom/alteriom-webhook-connector is private. A method's path, parameters and response come from what that service documents, and the client's README section for each group (`README.md` "API Client") is the public description. Nothing about the service's internals belongs in this repository.
