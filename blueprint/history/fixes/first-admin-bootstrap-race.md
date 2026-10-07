# Current Feature

**Title:** Close the first-admin bootstrap race
**Type:** Fix
**Status:** verified
**Branch:** `fix/first-admin-bootstrap-race`
**Fixes:** F-06

## The problem

`Users.access.create` (`src/collections/Users/config.ts`) decides whether an
anonymous request may self-register by checking `payload.count` first, then
deciding:

```ts
create: async ({ req }) => {
  if (req.user) return true
  const { totalDocs } = await req.payload.count({ collection: 'users' })
  return totalDocs === 0
},
```

This is a classic check-then-act race. Two concurrent anonymous
`POST /api/users` requests, arriving before either commits, can both read
`totalDocs === 0` and both pass. This schema has no `roles` field - every
`Users` document is equally privileged - so "two initial admins" really
means: two different self-chosen accounts, each fully privileged, both
created without ever needing to already be logged in. The window only exists
between provisioning a fresh database and the first real registration; it is
not exploitable against an already-initialized site, where `totalDocs` is
never `0`.

## The fix

Replace the check-then-act read with an atomic claim, using a mechanism
MongoDB itself enforces rather than a second read-then-write race of our own.

Add a new hidden, single-purpose collection,
`src/collections/BootstrapLock/config.ts`:

```ts
import type { CollectionConfig } from 'payload'

/**
 * A single-document lock that makes Users.access.create's first-admin
 * bootstrap atomic. See
 * blueprint/history/fixes/first-admin-bootstrap-race.md for why a plain
 * payload.count() read-then-decide was a race.
 *
 * Hidden from the admin nav - this collection exists for exactly one
 * internal purpose and is never meant to be browsed or edited by a human.
 */
export const BootstrapLock: CollectionConfig = {
  slug: 'bootstrap-lock',
  admin: {
    hidden: true,
  },
  access: {
    // Nobody reads, updates, or deletes this through a real request.
    // Users.access.create is the only caller, via the Local API with no
    // `user` passed (overrideAccess defaults to true), so this deny-all
    // never actually runs in normal operation - it's the safe default if
    // anything else ever tries to touch this collection directly.
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'first-admin',
    },
  ],
}
```

Register it in `src/payload.config.ts`'s `collections` array.

`key` is `unique` **and** `required`. Payload's MongoDB adapter only marks a
unique field's index `sparse` when the field is *not* required (confirmed in
`node_modules/@payloadcms/db-mongodb/dist/models/buildSchema.js`); `required:
true` here means the index is a plain unique index, so MongoDB itself
guarantees only one document with `key: 'first-admin'` can ever exist, and
rejects the second of any number of concurrent attempts to insert it.

`Users.access.create` becomes - **note the `totalDocs` guard is kept, not
replaced** (see the correction in Build step 1 below for why dropping it
would have been a regression):

```ts
create: async ({ req }) => {
  if (req.user) return true

  const { totalDocs } = await req.payload.count({ collection: 'users' })
  if (totalDocs > 0) return false

  try {
    // Atomically claim the bootstrap lock. MongoDB's unique index on `key`
    // means only the first of any number of concurrent requests can insert
    // this document; every later one throws a duplicate-key error here and
    // is denied - closing the race the count() read above leaves open on
    // its own.
    await req.payload.create({ collection: 'bootstrap-lock', data: {} })
    return true
  } catch {
    return false
  }
},
```

Must not break:

- A legitimate solo first registration on a fresh database must still
  succeed exactly as before.
- Every other `Users` access rule (`read`/`update`/`delete`, all
  `authenticated`) stays untouched.
- `BootstrapLock` must not appear in the admin nav or be reachable through a
  real API caller - it exists purely for this one internal check.

**Known accepted limitation**, not fixed by this change: if a request wins
the lock claim but its *own* `Users.create` subsequently fails validation
(malformed email, missing required field), the lock stays claimed forever
with zero real users ever created - bootstrap would be permanently stuck. A
legitimate registration through the admin UI's own form won't trigger this
(it submits valid data), so this only matters against a malformed or
adversarial first request. Closing it fully would need a self-expiring
(TTL) lock, which is disproportionate to a P3 finding already noted as "not
exploitable against an already-initialized site" - recorded here rather than
silently assumed away. Recovery, if it ever happens: delete the single
`bootstrap-lock` document (e.g. via a `payload run` script) to allow a retry.

## Build steps

- [x] **1. Add the `BootstrapLock` collection and the atomic claim.**
  Created `src/collections/BootstrapLock/config.ts`, registered it in
  `src/payload.config.ts`, replaced `Users.access.create`'s body.
  `npm run generate:types` emitted the `BootstrapLock` type.

  **Correction caught during implementation, not anticipated by the spec as
  written:** the spec's original claim-only design *replaced* the
  `totalDocs === 0` check instead of combining with it. Verified with a live
  script against this project's own database (which already has real
  users): with the lock cleared to simulate "never claimed," the claim-only
  version would let the very next anonymous request successfully claim an
  empty lock and self-register - reopening exactly the hole this fix exists
  to close, on a site that's long past bootstrap. Fixed by keeping the
  `totalDocs > 0` guard as a fast-path denial *before* attempting the claim;
  the claim still runs only when `totalDocs === 0`, which is where the
  actual race lived. The spec's code block above is updated to the corrected
  version.

  *Done when:* `npm run lint` - 0 errors, same 4 pre-existing warnings.
  `npm run build` - compiled in 12.5s. `curl http://localhost:3000/admin` -
  zero occurrences of "bootstrap-lock" in the response HTML.

  **Live-verified both halves of the corrected logic**, via throwaway
  `payload run` scripts (deleted after use) against the running dev server:
  - **Lock atomicity:** cleared the lock, then issued two sequential claims.
    First succeeded; second was denied with a uniqueness validation error
    (`The following field is invalid: key`) - proving only one claim can
    ever win, which is what makes two concurrent anonymous requests resolve
    to exactly one allowed.
  - **The regression check:** cleared the lock again (simulating "never
    claimed" on this already-initialized database, `totalDocs: 1`), then
    called `Users.config.access.create` directly with a fake anonymous
    `req`. Result: `false` - correctly denied, confirming the guard closes
    the gap the claim-only version left open.

  **Not verified:** the admin nav's actual authenticated rendering (no
  `/admin` login credentials in this session) - confirmed only that the
  unauthenticated response contains no reference to the collection.
  `admin.hidden: true` is Payload's documented mechanism for this, not a
  guess, but a direct look at the logged-in nav would be stronger evidence.

## Verify

1. `npm run generate:types && npm run lint && npm run build`
2. Confirm `bootstrap-lock` never renders in the admin nav.
3. Against the running dev server, via a throwaway `payload run` script:
   call `Users.access.create`'s logic path indirectly by driving two
   sequential `payload.create({ collection: 'bootstrap-lock', data: {} })`
   calls against a cleared lock state - the first must succeed, the second
   must throw a duplicate-key error. This is the actual mechanism the fix
   relies on; confirming it directly is stronger evidence than only
   exercising the real `/api/users` endpoint, which this session has no
   way to hit twice *concurrently* from outside a browser.
