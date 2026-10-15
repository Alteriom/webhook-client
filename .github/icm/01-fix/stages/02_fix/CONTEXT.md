# 02_fix — change the cause, not the symptom

One job: the smallest change at the defect's cause that turns the reproduction green without weakening it.

## Inputs
- Working (this run): `.github/icm/01-fix/stages/01_reproduce/output/reproduction.md`
- Reference (every run): `.github/icm/_shared/architecture.md`
- Reference (every run): `.github/icm/_shared/build-and-test.md`

Do NOT load: the other pipelines, `.github/icm/_shared/release.md`, other runs' output.

## Process
1. Confirm the cause in the code before changing anything; if it moved, record where it really is.
2. Change the cause. A REST method keeps the group pattern (rate limiter, retry, one `this.http` call); a receiver change never loosens a check (size, headers, age, constant-time signature, duplicates). Do not edit the reproduction to make it pass.
3. Keep the public surface: every exported name, signature and type stays compatible. If the fix cannot, stop: the person starts `02-endpoint` with `reproduction.md` as the request.
4. For an advisory: `npm update <package>` or the smallest range change that clears it; a runtime dependency (`axios`, `zod`) changing its range is a change consumers see, so say so.
5. Run the reproduction (green now), then `npm test`, `npm run lint`, `npm run build`, and `npm audit --audit-level=moderate`.

## Outputs
- change.md → output/ — the cause in one paragraph; each file changed and why; the reproduction's passing output; the full test, lint, build and audit results; anything deliberately not addressed.

## Human check
A person reads the diff beside the reproduction: it removes the cause, not only the symptom, and no exported signature or receiver check changed. Edit `change.md` if the explanation is wrong; stage 03 reads it.
