# 01_spec — the method, its types, and what it costs

One job: a spec that names the methods and types to add or change, from the service's documented contract, and the version class that follows.

## Inputs
- Working (this run): the request — an issue (`gh issue view <n> --comments`), the service's documented endpoint as a person gives it, or a `01-fix` run's `reproduction.md` (route `fix-to-endpoint`).
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (every run): `.github/icm/_shared/release.md`
- Reference (only when the change touches paths or versioned routes): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output, `schemas/openapi.json` (a stale snapshot), the WebSocket plan beyond its design.

## Process
1. Restate the need: who calls it (an agent, a dashboard, a receiver) and what they get.
2. Take the contract from what the service documents: method, path, query and body, response shape, errors. If it is not documented, ask the person for it; never infer it from guesses or copy anything internal to the service.
3. Place it: an existing group in `src/client.ts`, or a new `public readonly` group named after the service's area; the request and response types for `src/types.ts`; a guard in `src/guards.ts` only if callers must narrow at runtime; a stream event for `src/ws-types.ts` if it is pushed, not fetched.
4. Classify against [release.md](../../../_shared/release.md) "The number": a new method or optional field is a minor; a changed signature, a renamed or removed export, or a field made required is a major.
5. List the files stage 02 will touch, the tests it will add, and the README section it will write.

## Outputs
- spec.md → output/ — the need; the contract as documented, with its source; the methods and types, with signatures; the version class and why; the file and test list.

## Human check
A maintainer confirms the contract matches the service, approves the names and signatures, and accepts the version class. An exported name is permanent once published.
