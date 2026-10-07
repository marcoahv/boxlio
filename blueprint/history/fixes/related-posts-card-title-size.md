# Current Feature

**Title:** Related Posts cards render their titles too large
**Type:** Fix
**Status:** verified
**Branch:** `fix/related-posts-card-title-size`

## The problem

`Card` (`src/components/Card.tsx`) always renders its title as
`<Heading level={3}>`, which defaults to `ui-heading-3`'s full visual size
(see `Heading`'s `SIZE[size ?? level]` fallback in
`src/components/primitives/Heading.tsx`). That's the right size for the main
`/blog` listing grid, where each `Card` is a primary content block
(`src/collections/Pages/blogBlocks/BlogListing/Component.tsx`).

The Post detail page's "Related Posts" rail
(`src/app/(frontend)/blog/[slug]/page.tsx:62-68`) reuses the same `Card`
inside a narrower, secondary sidebar-style section. At full `h3` size, three
related-post titles read louder than the post body they sit next to —
visually competing with the primary content instead of supporting it.

The working tree already carries an uncommitted, unreviewed attempt at this:
`Card` gained a `titleSize?: HeadingProps['size']` prop, and the Related
Posts call site passes `titleSize={5}`. It was never run through the spec →
implement → verify loop, so it has no recorded check, no confirmation the
default call site is unaffected, and no commit. This fix formalizes,
verifies, and lands exactly that change — it does not redesign the approach.

## The fix

Keep the existing approach as-is; it's the right shape for a two-call-site
project (`Heading`'s own `size` prop already exists for exactly this: a
visual size independent of semantic level, so the `h3` stays correct for
document outline/SEO while only its rendered size shrinks).

- `Card`'s new `titleSize?: HeadingProps['size']` prop, forwarded to
  `<Heading level={3} size={titleSize}>`.
- `BlogListing/Component.tsx`'s call site passes no `titleSize` — confirm it
  keeps rendering at full `ui-heading-3` size, unchanged from before this fix.
- The Related Posts call site in `blog/[slug]/page.tsx` passes `titleSize={5}`
  (`ui-heading-5`), confirm that visually reads as secondary/supporting next
  to the post body, not competing with it.

Must not break:

- The `/blog` listing grid's card titles (no visual regression — this is the
  call site with no `titleSize` passed).
- `Heading`'s own contract: `level={3}` must still render a real `<h3>` for
  both call sites — only the rendered size changes, never the document
  outline level.

## Build steps

- [x] **1. Verify and commit the existing `titleSize` change.**
  No code change was needed beyond what was already in the working tree
  (`src/components/Card.tsx`, `src/app/(frontend)/blog/[slug]/page.tsx`) —
  this step was verification, not new implementation.

  *Done when:* `npm run lint` passes with no new warnings in either file;
  `npm run build` compiles; visiting a Post detail page shows the Related
  Posts rail with visibly smaller titles than the post's own heading, each
  title still an `<h3>` in the DOM (inspect element or view source); visiting
  `/blog` shows the listing grid's card titles unchanged from `main` (no
  `titleSize` passed there, so no visual difference before/after this fix).
  **Verified against the running dev server (localhost:3000, already
  running):** `/blog/whats-under-the-hood-media-seo-and-caching-in-boxlio`'s
  Related Posts rail renders `<h3 class="ui-heading-5">` for each related
  card — a real `<h3>`, visually sized down, confirmed in the live response
  HTML. `/blog`'s listing grid renders every card title as
  `<h3 class="ui-heading-3">`, unchanged. `npm run lint`: 0 errors, same 4
  pre-existing warnings in untouched files. `npm run build`: compiled in
  9.5s.

## Verify

1. `npm run lint && npm run build`
2. `npm run dev`, open any Post detail page with at least one related post —
   confirm the Related Posts titles read smaller than the main post heading.
3. Open `/blog` — confirm the listing grid's card titles look exactly as they
   did on `main` before this fix (same visual size as every other block that
   uses `Heading level={3}` with no explicit `size`).
4. View source or inspect element on both pages — confirm every card title is
   still a real `<h3>` element in both places.
