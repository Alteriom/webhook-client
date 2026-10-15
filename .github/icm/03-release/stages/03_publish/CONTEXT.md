# 03_publish — the person tags, the agent confirms

One job: confirm that the tag the person pushed published the right commit to npm and made the GitHub release. The agent runs no publishing command.

## Inputs
- Working (this run): `.github/icm/03-release/stages/02_prepare/output/release-pr.md` — or, for a check of an earlier release (route `publish-check`), only the tag `vX.Y.Z` the person names; start at step 2.
- Reference (every run): `.github/icm/_shared/release.md`

Do NOT load: the other pipelines, other runs' output, the source tree.

## Process
1. Confirm the tag is on `main`'s merge commit (`git fetch --tags && git branch -r --contains vX.Y.Z` lists `origin/main`). If it is not, tell the person before anything is announced.
2. Find the `release.yml` run for the tag (`gh run list --workflow release.yml --limit 3`) and read its result. A failure before `npm publish` published nothing: the fix is a new commit and a new tag, never a moved tag.
3. Check each destination: npm (`npm view @alteriom/webhook-client@X.Y.Z version`, and `dist-tags`), the GitHub release (`gh release view vX.Y.Z`), and that the TypeDoc pages run on `main` passed if `src/` changed.

## Outputs
- publication.md → output/ — the tag and the commit it points at; the workflow run with its result; each destination with the version seen and a link.

## Human check
A person confirms the version is on npm and in the GitHub releases, built from `main`, before it is announced.
