# Findings

> **Generated file.** The findings ledger: review findings raised by `/audit`
> against the work in progress, each with a durable ID, severity (P0-P3), and
> status. `/implement` marks repaired findings `fixed`, a later `/audit` pass
> moves them to `closed`, and `/complete` refuses to merge while any P0 or P1
> finding is `open` or `fixed`, then archives resolved findings with the work
> and resets this file.

### F-06 [P3] unverified - Narrow bootstrap race on Users.access.create

**File:** src/collections/Users/config.ts
**Found:** 2026-09-19 by /audit (scope: current; lens: security)
**Why it matters:** The first-admin bootstrap check (`req.user` present, else `payload.count` reports zero users) has a check-then-act gap: two concurrent anonymous `POST /api/users` requests arriving before either commits could both read `totalDocs === 0` and both succeed, creating two initial admins instead of one. This is the standard community-documented pattern for this exact problem (Payload has no built-in atomic "claim the first user" primitive), and the window only exists for the few moments between provisioning a fresh database and the first real admin registering - not exploitable against an already-initialized site, where `totalDocs` is never 0. Recorded as a lead, not a confirmed defect.
**Suggested fix:** No action needed unless it becomes a real concern; if it ever does, a unique index or a one-time setup flag would close the window.
**Resolution:**
