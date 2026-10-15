# 02-endpoint — the pipeline

Agree the method and its types, write them in the house pattern with tests, document and propose.

| Stage | Job | Input | Output | Human check |
|---|---|---|---|---|
| [`01_spec`](stages/01_spec/CONTEXT.md) | the method, its types, and what it costs | the request | `output/spec.md` | A maintainer confirms the contract matches the service, approves the names and signatures, and accepts the version class. An exported name is permanent once published. |
| [`02_implement`](stages/02_implement/CONTEXT.md) | the code, the types and the tests | 01_spec's `spec.md` | `output/change.md` | A person reads the diff beside the approved spec: the names, signatures and paths match it, every method follows the group pattern, and every method has a test asserting what it sends. Edit `change.md` if it is wrong; stage 03 reads it. |
| [`03_verify`](stages/03_verify/CONTEXT.md) | checks, README and changelog, pull request | 02_implement's `change.md` | `output/pull-request.md` | A person reads `pull-request.md` and the README section and says whether to open it. The reviewer merges once every check is green. |
