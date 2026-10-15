# 03-release — release a version

One run is one version of `@alteriom/webhook-client`, from the unreleased changelog entries to the same number on npm and in the GitHub releases. Six tags so far (`v0.0.1` to `v1.2.0`), five on npm.

A pushed `v*` tag publishes (`release.yml`), so the tag is the person's act, pushed on `main` after the release pull request merges. The agent plans, prepares the pull request, and confirms the result. It never pushes a tag or runs `npm publish`.

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Plan](stages/01_plan/CONTEXT.md) — what ships, and which number.
2. [Prepare](stages/02_prepare/CONTEXT.md) — the release pull request.
3. [Publish](stages/03_publish/CONTEXT.md) — the person tags; the agent confirms npm and the release.
