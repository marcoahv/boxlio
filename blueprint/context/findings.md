# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-05 [P3] open - The `({ req }) => Boolean(req.user)` access predicate is now duplicated across 7 configs

**File:** src/collections/Pages/config.ts:27-29, src/collections/Posts/config.ts, src/collections/Categories/config.ts, src/collections/Media/config.ts, src/globals/Header/config.ts, src/globals/Footer/config.ts, src/globals/Settings/config.ts
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `fix/lock-down-access-control` repeats the identical one-line `({ req }) => Boolean(req.user)` check in five more configs, on top of the two (`Pages`, `Posts`) that already had it. Purely a maintainability observation, not a defect - the logic is correct everywhere it appears - but a shared `authenticated: Access` helper (e.g. `src/access/authenticated.ts`) would remove the duplication and give the project one place to change the rule later.
**Suggested fix:** Extract `export const authenticated: Access = ({ req }) => Boolean(req.user)` and import it in all seven configs. Optional follow-up, not required for this fix.
**Resolution:**

### F-06 [P3] unverified - Narrow bootstrap race on Users.access.create

**File:** src/collections/Users/config.ts
**Found:** 2026-09-19 by /audit (scope: current; lens: security)
**Why it matters:** The first-admin bootstrap check (`req.user` present, else `payload.count` reports zero users) has a check-then-act gap: two concurrent anonymous `POST /api/users` requests arriving before either commits could both read `totalDocs === 0` and both succeed, creating two initial admins instead of one. This is the standard community-documented pattern for this exact problem (Payload has no built-in atomic "claim the first user" primitive), and the window only exists for the few moments between provisioning a fresh database and the first real admin registering - not exploitable against an already-initialized site, where `totalDocs` is never 0. Recorded as a lead, not a confirmed defect.
**Suggested fix:** No action needed unless it becomes a real concern; if it ever does, a unique index or a one-time setup flag would close the window.
**Resolution:**
