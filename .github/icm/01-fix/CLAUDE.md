# 01-fix — fix a defect

One run is one defect in the client, the receiver, the stream client, the types, or a dependency advisory: reproduced, fixed at its cause, and proposed as a pull request with the evidence. Fixes here have been wrong paths against the service (#1, #5), type mistakes (#11's `delivery_mode`), and advisories that turned CI's audit red (#14).

A fix keeps the public surface: if it needs a new method or a changed exported type, it stops and the person starts `02-endpoint` (route `fix-to-endpoint` in the root `AGENTS.md`).

Stages, in order; inputs, outputs and checks for each are in [CONTEXT.md](CONTEXT.md):

1. [Reproduce](stages/01_reproduce/CONTEXT.md) — make it fail on purpose.
2. [Fix](stages/02_fix/CONTEXT.md) — change the cause, watch the reproduction pass.
3. [Verify](stages/03_verify/CONTEXT.md) — the full checks, the changelog, the pull request.
