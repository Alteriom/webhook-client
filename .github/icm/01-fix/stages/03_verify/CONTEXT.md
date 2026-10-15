# 03_verify — checks, changelog, pull request

One job: the pull request a reviewer can merge, with the evidence CI will look for. Running the checks and writing the changelog entry are its steps, not separate jobs.

## Inputs
- Working (this run): `.github/icm/01-fix/stages/02_fix/output/change.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Run what CI runs ([build-and-test.md](../../../_shared/build-and-test.md) "What CI runs"): lint, `npm test -- --coverage` against the floor, `npm run build` with the size of `dist/` under 110 KB, `npm pack --dry-run`, `npm audit --audit-level=moderate`.
2. Add the entry to `CHANGELOG.md` under an `## [Unreleased]` heading (create it above the newest version if it is missing) in the wording of the entries around it. Update the `README.md` section that described the old behaviour. Do not change `package.json`'s version: that is a release.
3. Write the pull request: what was wrong, how you know (the reproduction), what the change does; the checks run and their results. Title in the commit format of `CONTRIBUTING.md` "Commit Message Format", `fix(<scope>): <the outcome>`. Nothing in it names the service's host or a credential.
4. After the human check, the agent opens it against `main` from this file (`gh pr create --base main --title "<title>" --body-file <this stage's output/pull-request.md>`). The agent never merges.

## Outputs
- pull-request.md → output/ — the title and body, the checks run with their results, the changelog entry as written.

## Human check
A person reads `pull-request.md` and its evidence, then says whether to open it. The reviewer, not the author, merges, once every check on the last commit is green.
