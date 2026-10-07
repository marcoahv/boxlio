# Current Feature

**Title:** Extract a shared `authenticated` access helper
**Type:** Fix
**Status:** verified
**Branch:** `fix/shared-authenticated-access-helper`
**Fixes:** F-05

## The problem

The identical one-line access predicate `({ req }) => Boolean(req.user)` is
repeated **18 times across 8 config files** — more than finding F-05
originally scoped (it named 7 files; `src/collections/Users/config.ts` also
has it, on `read`/`update`/`delete`, and was missed):

- `src/collections/Pages/config.ts` — `create`, `update`, `delete`
- `src/collections/Posts/config.ts` — `create`, `update`, `delete`
- `src/collections/Categories/config.ts` — `create`, `update`, `delete`
- `src/collections/Media/config.ts` — `create`, `update`, `delete`
- `src/collections/Users/config.ts` — `read`, `update`, `delete`
- `src/globals/Header/config.ts` — `update`
- `src/globals/Footer/config.ts` — `update`
- `src/globals/Settings/config.ts` — `update`

Not a defect — the logic is correct everywhere it appears — but it's one rule
copy-pasted 18 times, so a future change to "authenticated" (e.g. requiring a
specific role) means hunting down and editing all 18 identically, with no
compiler help if one is missed.

## The fix

Add one shared helper and import it everywhere the predicate appears
verbatim. Does not touch `Users.create`'s own bootstrap logic (the
`async ({ req }) => { if (req.user) return true; ... }` block) — that's a
different predicate serving a different purpose (F-06's territory), not a
copy of this one.

- New file `src/access/authenticated.ts`:
  ```ts
  import type { Access } from 'payload'

  /** True once any user is logged in to the admin panel - no roles yet. */
  export const authenticated: Access = ({ req }) => Boolean(req.user)
  ```
- In each of the 8 files above, import `{ authenticated } from '@/access/authenticated'`
  and replace every `({ req }) => Boolean(req.user)` occurrence with
  `authenticated` (a bare reference, not a call — `Access` functions are
  invoked by Payload itself).

Must not break:

- Every collection/global keeps exactly the same effective access rule —
  this is a pure refactor, zero behavior change. `Pages.access.read: () =>
  true` and `Users.access.create`'s bootstrap logic are untouched; only the
  18 identical-predicate lines move.
- `npm run build`'s typecheck must still pass with `Access` imported from
  `payload` — confirm the exported type name and generic shape against an
  existing access function in the codebase before relying on it blind.

## Build steps

- [x] **1. Add the helper and replace all 18 occurrences.**
  Created `src/access/authenticated.ts`, then updated the 8 config files to
  import and use it in place of the inline predicate.

  *Done when:* `grep -rn "Boolean(req.user)" src/` returns nothing outside
  `src/access/authenticated.ts` itself — **confirmed**, exactly one match,
  inside the helper. Every one of the 8 files imports `authenticated` from
  `@/access/authenticated` — confirmed by the edits themselves (Pages, Posts,
  Categories, Media, Users, Header, Footer, Settings). `npm run lint` — 0
  errors, same 4 pre-existing warnings in untouched files. `npm run build` —
  compiled in 29.0s, so the `Access` type usage typechecks across all 8
  call sites with their differing `TData` shapes (collections vs. globals).

  **Live-verified against the running dev server** (unauthenticated `curl`,
  no session cookie):
  - `POST /api/pages` (create) → `403` — still denied, matches pre-fix
  - `POST /api/globals/settings` (update) → `403` — still denied
  - `GET /api/pages` (read) → `200` — still public, `read: () => true` on
    `Pages`/`Posts`/`Categories`/`Media` was untouched by this refactor

  This proves the security-critical half (anonymous requests still can't
  create/update/delete) directly. The positive half — a **logged-in** user
  can still create/update/delete, exactly as before — was not curl-tested
  (no admin credentials available in this session) and is inferred from: the
  helper is the exact same function (`({ req }) => Boolean(req.user)`, byte-
  identical body) now called by reference instead of inlined, `req.user`
  population is untouched, and the build typechecks every call site. If you
  want direct confirmation, open `/admin`, log in, and confirm Pages, Posts,
  Categories, Media, Users, Header, Footer, and Settings are all still
  editable.

## Verify

1. `npm run lint && npm run build`
2. `grep -rn "Boolean(req.user)" src/` — only hit should be inside
   `src/access/authenticated.ts`.
3. Against the running dev server: open `/admin`, confirm Pages, Posts,
   Categories, Media, Users, Header, Footer, and Settings are all still
   editable while logged in (no access-control regression from the
   refactor).

## Findings

### shared-authenticated-access-helper/F-05 [P3] closed - The `({ req }) => Boolean(req.user)` access predicate is now duplicated across 7 configs

**File:** src/collections/Pages/config.ts:27-29, src/collections/Posts/config.ts, src/collections/Categories/config.ts, src/collections/Media/config.ts, src/globals/Header/config.ts, src/globals/Footer/config.ts, src/globals/Settings/config.ts
**Found:** 2026-09-19 by /audit (scope: current; lens: quality)
**Why it matters:** `fix/lock-down-access-control` repeats the identical one-line `({ req }) => Boolean(req.user)` check in five more configs, on top of the two (`Pages`, `Posts`) that already had it. Purely a maintainability observation, not a defect - the logic is correct everywhere it appears - but a shared `authenticated: Access` helper (e.g. `src/access/authenticated.ts`) would remove the duplication and give the project one place to change the rule later.
**Suggested fix:** Extract `export const authenticated: Access = ({ req }) => Boolean(req.user)` and import it in all seven configs. Optional follow-up, not required for this fix.
**Resolution:** Fixed by `fix/shared-authenticated-access-helper`, closed by `/audit` (scope: current; lens: all) on 2026-10-06. Scope grew by one file during repair: `src/collections/Users/config.ts` also carried the identical predicate (on `read`/`update`/`delete`) and was missed from this finding's original file list - it's fixed too, 8 files / 18 occurrences total. `Users.access.create`'s own async bootstrap check (F-06) is a different predicate and was correctly left untouched. Re-examined the full diff fresh (not just this finding's claim): `grep -rn "Boolean(req.user)" src/` returns exactly one match, inside the new helper; `npm run build` compiles, confirming `Access<TData>`'s generic typechecks against every collection's and global's differing arg shape; `npm run lint` is unchanged (0 errors, same 4 pre-existing warnings, none in the touched files); live unauthenticated `curl` checks against the running dev server match pre-fix behavior exactly (create/update 403, read 200). No new defect introduced by the repair.
