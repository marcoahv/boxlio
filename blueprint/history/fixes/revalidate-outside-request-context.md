# Current Feature

**Title:** Revalidation hooks crash writes made outside a Next.js request
**Type:** Fix
**Status:** verified
**Branch:** `fix/revalidate-outside-request-context`

## The problem

Every `afterChange`/`afterDelete` hook in this project calls Next's
`revalidateTag`/`revalidatePath` directly, unguarded:

- `src/collections/Pages/hooks/revalidatePage.ts` — `updatePage`, `deletePage`
- `src/collections/Posts/hooks/revalidatePost.ts` — `updatePost`, `deletePost`
- `src/collections/Categories/hooks/revalidateCategories.ts` —
  `revalidateCategories`, `deleteCategories`
- `src/globals/hooks/revalidateGlobal.ts` — `revalidateGlobal`

Both functions require an active Next.js request context (a "static
generation store"). Calling them from anywhere else — a standalone script run
via `payload run`, a migration, a cron job, a seed script, anything driving
Payload's Local API outside a real HTTP request — throws
`Invariant: static generation store missing`.

This isn't theoretical: I hit it for real this session writing Accordion
content to the home page via a script. Because the hook throws from inside
`afterChange`, and Payload wraps the write and its hooks in one transaction
(see `.claude/rules/security-critical.md`'s transaction-safety note, and
MongoDB Atlas is a replica set so the transaction is real), **the throw
aborted the transaction and rolled back the actual document write** — the
content change was silently lost, not just the cache invalidation. I had to
bypass Payload entirely and write straight to MongoDB to get the content in.

## The fix

Revalidation is a side effect of the write, not part of it. A cache
invalidation failing must never fail — or roll back — the document change
it's attached to.

Add one shared helper, `src/utilities/safeRevalidate.ts`:

```ts
/**
 * Runs a revalidateTag/revalidatePath call safely outside a request context.
 *
 * Both throw "Invariant: static generation store missing" when called
 * outside an active Next.js request (a standalone script, migration, or
 * cron job driving Payload's Local API). These run from afterChange/
 * afterDelete hooks, so an uncaught throw here aborts the whole write's
 * transaction - the actual document change rolls back along with the cache
 * invalidation that was only ever a side effect. See
 * blueprint/history/fixes/revalidate-outside-request-context.md for why.
 */
export function safeRevalidate(label: string, run: () => void): void {
  try {
    run()
  } catch (error) {
    console.warn(
      `[revalidate] skipped (${label}):`,
      error instanceof Error ? error.message : error,
    )
  }
}
```

Wrap every hook body in all four files with it, one `safeRevalidate(label,
() => { ... })` call per function, keeping each function's existing
`revalidateTag`/`revalidatePath`/logger calls unchanged inside the callback.

Must not break:

- **Zero behavior change for the normal case** — inside a real Next.js
  request (an admin-panel save, which is how every existing manual test and
  the live site actually exercises these hooks), revalidation must still run
  exactly as before: same tags, same paths, same `payload.logger.info` calls.
  `safeRevalidate` only changes what happens when the call *throws*.
- Every hook's existing signature, args, and logger calls stay as they are -
  this wraps the body, it doesn't restructure the hook.
- This is explicitly a last-resort safety net, not a fix for "scripts should
  remember to disable revalidation." A future script that cares about
  immediate cache freshness should still clear `.next/cache` manually or pass
  a `context` flag if one gets added later - this fix's job is only to stop a
  side effect from destroying the actual write.

## Build steps

- [x] **1. Add `safeRevalidate` with a focused test, then wrap all 8 hook bodies.**
  Created `src/utilities/safeRevalidate.ts` and
  `tests/int/safeRevalidate.int.spec.ts`. Wrapped `updatePage`/`deletePage`,
  `updatePost`/`deletePost`, `revalidateCategories`/`deleteCategories`, and
  `revalidateGlobal` each in one `safeRevalidate(...)` call.

  *Done when:* `npm run test:int` — 123 passed (16 files), including the 4
  new `safeRevalidate` tests. `npm run lint` — 0 errors, same 4 pre-existing
  warnings, nothing new. `npm run build` — compiled in 16.7s.

  **Live-verified the actual repro**, using a throwaway `payload run` script
  (deleted after use) that updated the `home` Page's title via the Local
  API, outside any Next.js request - the exact scenario that rolled back my
  earlier accordion-content write this session:
  ```
  update() returned without throwing
  VERIFIED title after write: verify-safe-revalidate 2026-10-07T04:23:30.575Z
  PASS: write persisted
  [revalidate] skipped (page home): Invariant: static generation store missing in revalidateTag page_home
  ```
  The write survived; the warning appears exactly where the crash used to
  abort the transaction. The script restored the original title afterward,
  so the page content is unchanged.

  **Not verified:** the normal path - saving a Page/Post/Category/global
  through a real admin-panel request still revalidating correctly - requires
  `/admin` login, and I have no credentials in this session. This is
  inherently low-risk: `safeRevalidate` only changes behavior when the
  wrapped call *throws*; inside a real Next.js request it doesn't throw, so
  the callback runs exactly as it did before this fix, unchanged. If you
  want to confirm directly: edit and save any Page in `/admin`, check the
  published route updates immediately.

## Verify

1. `npm run lint && npm run test:int && npm run build`
2. Against the running dev server: edit and save any Page in `/admin`,
   confirm the change appears on the published route immediately.
3. Write a throwaway script that calls `payload.update` on an existing Page
   via `payload run`, outside any Next.js request - confirm it completes
   without throwing, the write is actually persisted (read it back), and a
   `[revalidate] skipped` warning appears in the output instead of an
   `Invariant` crash.
