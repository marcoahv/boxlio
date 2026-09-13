# Current Feature

**Title:** Two small UI fixes: Hero button labels + blog post header image size
**Type:** Fix
**Status:** verified
**Branch:** fix/blog-post-header-image-thumbnail-size (built on top of the
unmerged fix/rename-hero-links-to-buttons; both were completed together in
one commit per the user's explicit choice, rather than as two separate
history entries)

This entry bundles two independent, unrelated fixes that ended up stacked on
the same branch. Each is documented separately below.

## Fix 1: Rename Hero block's Links to Buttons

### The problem

[Hero/config.ts](src/blocks/Hero/config.ts) has an array field called `links`
(`labels: { singular: 'Link', plural: 'Links' }`), but every item in it
renders as an actual button — [Hero/Component.tsx](src/blocks/Hero/Component.tsx)
gives each one a `ui-btn` class plus `variant` (Solid/Outline/Ghost) and
`color` (Primary/Secondary) controls, both button-shaped concepts, not link
ones. The admin UI called these "Links", which didn't match what an editor
sees rendered on the page.

### The fix

Admin-label-only rename, no data or behavior change: added `label: 'Buttons'`
and changed `labels` to `{ singular: 'Button', plural: 'Buttons' }` on the
`links` array field. Kept `name: 'links'` exactly as-is — renaming it would
change its database key and orphan the home page's already-saved Hero
buttons.

### Verify

- `npm run lint` / `npm run build` pass.
- Manual (not re-confirmed live in this session — the running dev server
  predates this edit and Payload block config loads once per process, same
  caveat as before): editing a Hero block should show "Buttons" / "Add
  Button" instead of "Links" / "Add Link".

## Fix 2: Blog post header image: compact thumbnail instead of full-width banner

### The problem

The blog post detail page's header
([PostClient.tsx:47](src/app/(frontend)/blog/[slug]/PostClient.tsx#L47)) rendered
its featured image as a big full-width, full-bleed 16:9 banner
([PostPreview.tsx](src/components/PostPreview.tsx)'s `variant="header"` path:
`w-full aspect-video object-cover`, requesting `imageSize="fullSize"`,
1280×720). The user wanted it back to a compact, thumbnail-sized image — the
same contained, non-full-width treatment already used for post cards on the
blog listing page (`PostPreview`'s default `variant="featured"` path).

### The fix

Made the `header` variant reuse `featured`'s existing image treatment instead
of maintaining its own separate full-width banner styling:

- In `PostPreview.tsx`: removed the `header`-only `flex-col items-stretch`
  layout override (both variants now share the same responsive row layout at
  `atMedium+`), removed the separate `banner` (`w-full aspect-video
  object-cover`) rendering path, and render the featured image
  unconditionally at the top of `content` for every variant.
- Widened `imageSize` prop type to include `'thumbnail'` and changed the
  header call site in `PostClient.tsx` to `imageSize="thumbnail"` (320×180).
- Left the `featured`-only post title (`<Heading level={3}>`) condition
  as-is — the post detail page already renders its own `<h1>` above
  `PostPreview`.
- Left the other `PostPreview` call site
  ([FeaturedPost/Component.tsx](src/collections/Pages/blogBlocks/FeaturedPost/Component.tsx#L24),
  `imageSize="fullSize"`) fully untouched.

### Verify

- Screenshot of `/blog/personality-01-serious--elegant`: the header image
  now renders as a compact ~300×167px box next to the meta row, not a
  full-width banner. (That post's featured image is an SVG, which Sharp
  can't rasterize into named sizes — it falls back to serving the raw
  original file, same as before this fix; SVGs scale losslessly to
  whatever CSS box contains them, and the box is now correctly small. A
  raster image would request the real `-320x180` generated file.)
- Manual, not re-verified live in this session: confirm the blog listing
  page's own post cards and its featured-post banner (`FeaturedPost` block)
  are visually unchanged — that call site's code was not touched.

## Combined checks

- `npm run lint` — 0 errors (4 pre-existing warnings, unrelated files).
- `npm run build` — compiles successfully.
- No open findings, no independent review pending.
