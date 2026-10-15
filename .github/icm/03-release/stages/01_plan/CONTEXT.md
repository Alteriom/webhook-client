# 01_plan — choose what ships and its number

One job: a release plan that names the version, justifies its class, and drafts the dated changelog section.

## Inputs
- Working (this run): the unreleased changes — `CHANGELOG.md`'s unreleased entries, and `main` since the previous tag (`git log --oneline v<previous>..origin/main`, with `git diff --stat v<previous> origin/main -- src/`).
- Reference (every run): `.github/icm/_shared/release.md`
- Reference (every run): `.github/icm/_shared/gotchas.md`

Do NOT load: the other pipelines, other runs' output, released changelog sections beyond the previous one.

## Process
1. Find the previous tag (`git tag --list 'v*' --sort=-v:refname | head -3`) and what npm has (`npm view @alteriom/webhook-client dist-tags versions`). Say whether that tag is on `main` or on a branch ([gotchas.md](../../../_shared/gotchas.md) "Tags pushed before the merge").
2. List every merged change since the tag and say whether it changes what ships (`src/`, `package.json` ranges, `README.md`) or not (tests, lockfile, CI). Nothing that ships means no release is needed: say so and stop.
3. Match each shipped change to a changelog entry; fill the gaps. Classify against [release.md](../../../_shared/release.md) "The number" and say which change decides it.
4. Confirm `main` is green (`gh run list --branch main --workflow ci.yml --limit 3`) and the audit is clean.
5. Draft `## [X.Y.Z] - YYYY-MM-DD` with its sections; name the branch (`release/X.Y.Z`) and the title (`chore: release vX.Y.Z`).

## Outputs
- release-plan.md → output/ — the version and the change that decides its class; what ships and what does not; the state of `main`; the drafted section; branch and title.

## Human check
A maintainer approves the version number and the changelog wording. The number is permanent once tagged: a mistake later costs a new version, never a retag.
