# 01_reproduce — reproduce the reported defect

One job: turn the report into a test, or an audit, that fails on demand for the reason reported.

## Inputs
- Working (this run): the report — read whole with what it links: an issue (`gh issue view <n> --comments`), a red run (`gh run view <run-id> --log-failed`), an advisory, or the call a consumer says misbehaved.
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (only when the report is a red run, an advisory, a path or a packaging problem): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, `.github/icm/_shared/release.md`, other runs' output.

## Process
1. If the report could be a vulnerability in this package (the receiver's verification above all), stop before writing anything: this pipeline ends in a public pull request, and the private report the contributing guide's "Reporting Vulnerabilities" describes is the route.
2. Restate the report as observed versus expected: the method or handler, the input, what came back or was thrown, and what should have. Never paste a real API key, secret or the service's address; use the placeholders the tests use.
3. Find the path with [architecture.md](../../../_shared/architecture.md) and name the suspected cause as `path:line`.
4. `npm ci`, then write the failing test in the suite [build-and-test.md](../../../_shared/build-and-test.md) "Where a test belongs" names, mocking axios or Socket.IO as the suite does. For an advisory, the reproduction is `npm audit` (and `npm ls <package>` to show which dependency pulls it in, runtime or development).
5. Run it (`npx jest <file>` or the audit) and keep the failing output. If it passes, the reproduction or the report is wrong: say which, and stop.

## Outputs
- reproduction.md → output/ — the restated report; the suspected cause (`path:line`) or the dependency chain; the test or command; the failing output; whether the fix can keep the public surface.

## Human check
A person runs the command or reads its output and confirms it fails for the reported reason and not a neighbouring one.
