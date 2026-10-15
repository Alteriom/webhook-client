# 03_verify — checks, README and changelog, pull request

One job: the pull request a reviewer can merge, with the documentation a consumer will read.

## Inputs
- Working (this run): `.github/icm/02-endpoint/stages/02_implement/output/change.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Run what CI runs ([build-and-test.md](../../../_shared/build-and-test.md) "What CI runs"): lint, tests with coverage against the floor, build with `dist/` under 110 KB, `npm pack --dry-run`, `npm audit --audit-level=moderate`.
2. Add the README section for the new methods under "API Client", in the shape of the sections around it, with placeholder keys and hosts (`https://your-agent.example.com`), never a real one.
3. Add the `CHANGELOG.md` entry under `## [Unreleased]` (create it if missing): `Added`, or `Breaking Changes` first if the spec said major. Do not bump `package.json`: that is a release.
4. Write the pull request: the need, the methods and types, the class, the tests, the checks with results. Title `feat(<scope>): <the outcome>`. After the human check the agent opens it (`gh pr create --base main --body-file <this stage's output/pull-request.md>`); it never merges.

## Outputs
- pull-request.md → output/ — title and body, the checks with results, the README and changelog text as written.

## Human check
A person reads `pull-request.md` and the README section and says whether to open it. The reviewer merges once every check is green.
