# 02_implement — the code, the types and the tests

One job: the approved methods and types, written in the house pattern, with tests that pin the request sent and the shape returned.

## Inputs
- Working (this run): `.github/icm/02-endpoint/stages/01_spec/output/spec.md`
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Branch from current `origin/main`. Add the types to `src/types.ts` with JSDoc, then the methods to their group in `src/client.ts` in the pattern [architecture.md](../../../_shared/architecture.md) "The REST client" describes (`agentSubscriptions` is the model): rate limiter, retry, one call, typed return.
2. Export what callers need from `src/index.ts`, beside the related names.
3. Add tests in the suite [build-and-test.md](../../../_shared/build-and-test.md) "Where a test belongs" names: for each method, the verb, path, query and body sent (assert on the mocked axios instance) and the value returned; for a new union or guard, a narrowing test in `tests/types.test.ts`.
4. Run `npm test`, `npm run lint` and `npm run build`. Anything the spec did not name goes back to the person, not into the diff.

## Outputs
- change.md → output/ — each file changed and why; the methods and types added with their signatures; the tests added; the test, lint and build output.

## Human check
A person reads the diff beside the approved spec: the names, signatures and paths match it, every method follows the group pattern, and every method has a test asserting what it sends. Edit `change.md` if it is wrong; stage 03 reads it.
