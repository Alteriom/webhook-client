---
verified_at: 2026-10-15
verified_commit: 3e2e8fea5fa683a579f72427e93fc1a355458d1b
---

# Releasing — from the changelog to npm

## The number

Semantic versioning, read from the commit types (`CONTRIBUTING.md` "Commit Message Format": `fix` is a patch, `feat` a minor, `BREAKING CHANGE` or `!` a major). A breaking change is anything that changes a public method's signature, removes or renames an exported type, guard or error, or changes what the receiver accepts. The version lives in `package.json:3` (and the lockfile), nowhere else.

## The changelog

`CHANGELOG.md` is Keep a Changelog, `## [X.Y.Z] - YYYY-MM-DD` with `Added`, `Changed`, `Fixed` and `Breaking Changes`. The GitHub release notes are not taken from it: `release.yml` writes them from `git log` since the previous tag ("Generate changelog").

## What publishes

`release.yml` runs on any pushed tag matching `v*` (`.github/workflows/release.yml:5`): `npm ci`, the tests, the build, a check that the tag equals `package.json`'s version (`.github/workflows/release.yml:36`), `npm publish --provenance` (`.github/workflows/release.yml:49`), then the GitHub release (`.github/workflows/release.yml:76`). Pushing the tag is the publish decision, and a person makes it. The tag goes on the release commit on `main` after the release pull request is squash-merged, so the package is built from what `main` holds.

`CONTRIBUTING.md` "Release Process" describes `npm version` and `git push --follow-tags`; that is the person's command, run on `main` after the merge, or the tag alone if the version was already bumped in the pull request. No agent runs it.

## Afterwards

The version on npm: `npm view @alteriom/webhook-client dist-tags`. The release: `gh release view vX.Y.Z`. A failed run before `npm publish` published nothing; it is fixed by a new commit and a new tag, never by moving the tag. A published version is never reused.
