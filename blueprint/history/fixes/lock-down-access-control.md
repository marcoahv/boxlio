# Current Feature

**Title:** Lock down default-open access control
**Type:** Fix
**Status:** verified
**Branch:** `fix/lock-down-access-control`
**Fixes:** F-01, F-02, F-03, F-04

### The problem

Five collection/global configs never define an `access` block for their
write operations, so Payload's default-open policy applies and anyone
unauthenticated can write to them over the REST/GraphQL API:

| Finding | File | Open operation(s) |
|---|---|---|
| F-01 [P0] | `src/collections/Users/config.ts` | `create`, `read`, `update`, `delete` - public self-registration of admin accounts |
| F-02 [P0] | `src/globals/Header/config.ts`, `Footer/config.ts`, `Settings/config.ts` | `update` - public rewrite of nav/branding, incl. `Settings.gtmCode` (site-wide script injection) |
| F-03 [P1] | `src/collections/Media/config.ts` | `create`, `update`, `delete` (only `read` is defined) |
| F-04 [P1] | `src/collections/Categories/config.ts` | `create`, `read`, `update`, `delete` - no `access` block at all |

`Pages` and `Posts` already show the correct pattern
(`src/collections/Pages/config.ts:26`): public `read`, `create`/`update`/
`delete` gated on `Boolean(req.user)`.

### The fix

Add matching `access` blocks everywhere the pattern is missing, reusing the
exact `({ req }) => Boolean(req.user)` gate `Pages`/`Posts` already use for
every write operation, and `read: () => true` where public read is intended
(`Media`, `Header`, `Footer`, `Settings`; `Categories` read is currently
unauthenticated too and nothing depends on that changing, so keep it public).

**Users is the one exception.** A flat `Boolean(req.user)` gate on `create`
would also block creating the very first admin account on a fresh database -
there's no user yet to satisfy the check, so the project could never
bootstrap. Use the standard Payload pattern instead: allow `create` when no
user is authenticated **and** the `users` collection is currently empty,
otherwise require `Boolean(req.user)`:

```ts
create: async ({ req }) => {
  if (req.user) return true
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  return totalDocs === 0
}
```

Must not break:
- Logging into `/admin` and creating/editing content as the existing admin user.
- Creating the very first admin user on a brand-new database (local dev reset, or a fresh clone of this template).
- The public frontend, which reads `Pages`/`Posts`/`Media`/`Header`/`Footer`/`Settings` without a `user` (unaffected - only `read` access changes for `Categories`, and only for globals/`Users`/`Media` create-update-delete does anything change).

This project's Commands section declares `npm run test:int`, so per
`coding-standards.md`'s testing gate, the access-control predicates count as
in-scope logic (validators with a right/wrong answer) and need a passing
unit test in the same diff - this may be the first step that creates
`tests/int/`, per `AGENTS.md`'s Commands note.

## Build steps

- [x] 1. **Users collection: bootstrap-aware access control.**
   Add the `access` block above to `src/collections/Users/config.ts`
   (`create` per the bootstrap check; `read`/`update`/`delete` gated on
   `Boolean(req.user)`). Add `tests/int/users-access.int.spec.ts` covering:
   `create` returns `true` with no `req.user` when `payload.count` reports
   zero users, `false` when it reports at least one, and `true` whenever
   `req.user` is set regardless of count (mock `req.payload.count`, don't
   hit a real database, per `coding-standards.md`).
   Done when: `npm run test:int` passes, and manually confirmed - a fresh
   database still allows creating the first admin via `/admin`.

- [x] 2. **Categories, Media, Header, Footer, Settings: authenticated writes.**
   Add `access: { read: () => true, create/update/delete: ({ req }) => Boolean(req.user) }`
   to `src/collections/Categories/config.ts` and `src/collections/Media/config.ts`
   (extending its existing `access` block), and
   `access: { read: () => true, update: ({ req }) => Boolean(req.user) }` to
   `src/globals/Header/config.ts`, `src/globals/Footer/config.ts`, and
   `src/globals/Settings/config.ts`.
   Done when: `npm run dev` running, an unauthenticated `curl -X POST
   http://localhost:3000/api/categories` (and the equivalent for `media`,
   `globals/header`, `globals/footer`, `globals/settings`) returns a 403/
   Forbidden, while the admin panel (logged in) can still create/edit each of
   these as before.

## Verify

- `npm run test:int` passes, including the new `users-access.int.spec.ts`.
- Manual: with the dev server running and logged out, `curl` (or Postman)
  `POST`/`PATCH`/`DELETE` against `/api/users`, `/api/categories`,
  `/api/media`, `/api/globals/header`, `/api/globals/footer`,
  `/api/globals/settings` - each rejects with 403.
- Manual: log into `/admin` as the existing user and confirm normal editing
  of Categories, Media, Header, Footer, and Settings still works.
- Manual (if practical - e.g. against a scratch local database): reset to an
  empty `users` collection and confirm `/admin`'s first-user creation screen
  still works.

## Verification record

Automated gates only; the curl-against-a-running-server and admin-login checks
in Verify above are manual follow-ups the user should still run against a live
dev server.

| Check | Result |
| --- | --- |
| `npm run test:int` | 78/78 tests passed (11 files, incl. new `tests/int/users-access.int.spec.ts`) |
| `npm run lint` | 0 errors, 4 pre-existing warnings (none introduced) |
| `npm run build` | compiled successfully |
| `/audit current` (quality, security, performance, tests) | F-01-F-04 re-reviewed and closed; F-05 (duplicated access predicate, P3) and F-06 (narrow bootstrap-race, P3 unverified) logged as non-blocking follow-ups |

## Findings

### lock-down-access-control/F-01 [P0] closed - Users collection has no access control, allowing public self-registration of admin accounts

**File:** src/collections/Users/config.ts
**Found:** 2026-09-19 by /audit (scope: full; lens: security)
**Why it matters:** The collection defines no `access` block at all, so Payload's default open policy applies to every operation, including `create`. `auth: true` only adds login/session plumbing; it does not restrict who may create a user. Anyone can `POST /api/users` with an email/password to register a new admin-panel account, then log into `/admin` with full write access to every collection and global - a complete authentication bypass. This directly contradicts `project-overview.md`'s own description of auth as "the only access-control gate in the project."
**Suggested fix:** Add an `access` block restricting `create`/`read`/`update`/`delete` to `({ req }) => Boolean(req.user)` (or a narrower rule, e.g. only the requesting user may update their own record), matching the pattern already used in `Pages`/`Posts`.
**Resolution:** Fixed by `fix/lock-down-access-control`. `create` uses a bootstrap-aware check (`Boolean(req.user)`, or `payload.count({ collection: 'users' })` reporting zero when anonymous) so the first admin can still be created on a fresh database; `read`/`update`/`delete` require `Boolean(req.user)`. Covered by `tests/int/users-access.int.spec.ts`. Re-reviewed 2026-09-19 by /audit (scope: current; lens: quality, security, performance, tests): the diff removes the public `create` path (unauthenticated requests only succeed while `users` is empty), `read`/`update`/`delete` correctly require `req.user`, and `npm run test:int` (78/78, incl. the new suite), lint, and build all pass. Closing.

### lock-down-access-control/F-02 [P0] closed - Header/Footer/Settings globals have no access control, allowing public rewrite of site-wide branding and script injection

**File:** src/globals/Header/config.ts, src/globals/Footer/config.ts, src/globals/Settings/config.ts
**Found:** 2026-09-19 by /audit (scope: full; lens: security)
**Why it matters:** None of the three globals define an `access` block, so `update` defaults to public/open, not just `read`. Anyone can `POST /api/globals/settings` (or `header`/`footer`) unauthenticated and rewrite nav links (phishing redirects), logos, CTAs, and - most severely - `Settings.gtmCode`, which is rendered as a script tag on every page. That's unauthenticated, site-wide stored script injection, not just defacement.
**Suggested fix:** Add `access: { read: () => true, update: ({ req }) => Boolean(req.user) }` to each global config, mirroring the `Pages`/`Posts` collection pattern (public read, authenticated write).
**Resolution:** Fixed by `fix/lock-down-access-control`. Added `access: { read: () => true, update: ({ req }) => Boolean(req.user) }` to all three globals. Re-reviewed 2026-09-19 by /audit (scope: current; lens: quality, security, performance, tests): all three globals now require `req.user` for `update`; `read` stays public as intended for frontend rendering. Closing.

### lock-down-access-control/F-03 [P1] closed - Media collection has no create/update/delete access control

**File:** src/collections/Media/config.ts:30
**Found:** 2026-09-19 by /audit (scope: full; lens: security)
**Why it matters:** The `access` block only defines `read: () => true`; `create`, `update`, and `delete` are unspecified and default to public. Anyone can upload files unauthenticated (mitigated somewhat by `mimeTypes: ['image/*']`, but still unbounded storage/cost abuse) or overwrite and delete existing media referenced across the site.
**Suggested fix:** Extend the `access` block with `create`/`update`/`delete: ({ req }) => Boolean(req.user)`, matching `Pages`/`Posts`.
**Resolution:** Fixed by `fix/lock-down-access-control`. Extended the `access` block with `create`/`update`/`delete: ({ req }) => Boolean(req.user)`. Re-reviewed 2026-09-19 by /audit (scope: current; lens: quality, security, performance, tests): `create`/`update`/`delete` now require `req.user`; `read` intentionally stays public. Closing.

### lock-down-access-control/F-04 [P1] closed - Categories collection has no access control at all

**File:** src/collections/Categories/config.ts
**Found:** 2026-09-19 by /audit (scope: full; lens: security)
**Why it matters:** No `access` block is defined, so `create`, `read`, `update`, and `delete` all default to public. Anyone can create, edit, or delete blog categories via the REST/GraphQL API without authentication.
**Suggested fix:** Add `access: { read: () => true, create/update/delete: ({ req }) => Boolean(req.user) }`, matching `Pages`/`Posts`.
**Resolution:** Fixed by `fix/lock-down-access-control`. Added `access: { read: () => true, create/update/delete: ({ req }) => Boolean(req.user) }`. Re-reviewed 2026-09-19 by /audit (scope: current; lens: quality, security, performance, tests): `create`/`update`/`delete` now require `req.user`; `read` intentionally stays public. Closing.
