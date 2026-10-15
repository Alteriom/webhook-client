# 03-release — the pipeline

Choose the number, prepare one pull request, let a person tag it, and confirm where it landed.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| [`01_plan`](stages/01_plan/CONTEXT.md) | choose what ships and its number | the unreleased changes | `output/release-plan.md` | A maintainer approves the version number and the changelog wording. The number is permanent once tagged: a mistake later costs a new version, never a retag. |
| [`02_prepare`](stages/02_prepare/CONTEXT.md) | the release pull request | 01_plan's `release-plan.md` | `output/release-pr.md` | A maintainer reviews the final commit with every check green, merges it, and then decides to tag: `git tag vX.Y.Z <merge commit on main> && git push origin vX.Y.Z` publishes. |
| [`03_publish`](stages/03_publish/CONTEXT.md) | the person tags, the agent confirms | 02_prepare's `release-pr.md` | `output/publication.md` | A person confirms the version is on npm and in the GitHub releases, built from `main`, before it is announced. |
