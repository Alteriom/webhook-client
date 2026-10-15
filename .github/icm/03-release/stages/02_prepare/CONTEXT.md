# 02_prepare — the release pull request

One job: one pull request that sets the version, dates the changelog, and passes every check, so that the commit it merges as is the one a person tags.

## Inputs
- Working (this run): `.github/icm/03-release/stages/01_plan/output/release-plan.md`
- Reference (every run): `.github/icm/_shared/release.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`

Do NOT load: the other pipelines, other runs' output.

## Process
1. Branch `release/X.Y.Z` from current `origin/main`.
2. `npm version X.Y.Z --no-git-tag-version` sets `package.json` and the lockfile without creating a tag. Never create or push a tag here.
3. Put the approved dated section in `CHANGELOG.md`, leaving an empty `## [Unreleased]` above it. Check `git grep -n "<previous version>"`: a document that keeps the version by hand is noted for a separate correction, not updated here.
4. Run `npm ci && npm run lint && npm test && npm run build`, the size of `dist/`, `npm pack --dry-run` and `npm audit --audit-level=moderate`. Fix what fails; never skip a check.
5. Open the pull request against `main` with the plan's title; the body is the changelog section plus the checks' output, and says that a person tags `vX.Y.Z` on `main` after the merge.

## Outputs
- release-pr.md → output/ — the pull request link and title, the files changed, the checks' output, the state of every check on the final commit.

## Human check
A maintainer reviews the final commit with every check green, merges it, and then decides to tag: `git tag vX.Y.Z <merge commit on main> && git push origin vX.Y.Z` publishes.
