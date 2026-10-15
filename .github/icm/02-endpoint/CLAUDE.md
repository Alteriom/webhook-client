# 02-endpoint — cover what the service added

One run is one gap between Alteriom/alteriom-webhook-connector and this client closed: a new endpoint group or method, a field or event type the types lack, a helper over existing calls. It is the job this repository does most: #6 (fifteen endpoint groups), #7 (typed event shapes), #8 (the stream client), #11 and #12 (agent subscriptions and `poll()`).

The service is private and this repository is public: the spec records the request and response the client needs, as the service documents them, and nothing about how the service works inside.

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Spec](stages/01_spec/CONTEXT.md) — the method, its types, and whether anything breaks.
2. [Implement](stages/02_implement/CONTEXT.md) — the code, the types and the tests.
3. [Verify](stages/03_verify/CONTEXT.md) — the checks, the README and changelog, the pull request.
