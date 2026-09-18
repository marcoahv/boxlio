# Current Feature

**Title:** The block-sync wrapper div broke `.ui-section:first-child`, flipping the header logo and first-section padding
**Type:** Fix
**Status:** verified
**Branch:** `fix/block-id-on-section-not-wrapper`

## The problem

The header renders the dark-text logo variant over a background-image Hero,
which the `header-logo-background-image-theme-specificity` fix previously
corrected. It is a regression, not a recurrence of the old cause.

### What changed

The editor/preview hover-sync feature (commit `564f361`) wrapped every
rendered block in its own `<div data-block-id>`:

- `src/blocks/index.tsx` - the `Blocks` dispatcher
- `src/app/(frontend)/blog/BlogPageClient.tsx` - the same pattern, twice, for
  `featuredPost` and `blogListing`

Rendered markup went from `main > div > section.ui-section` to
(confirmed by fetching the running page):

```html
<main><div><div data-block-id="6a9bb2d8..."><section class="ui-section"
  data-surface="inverse" data-has-background-image="true">
```

### Why that breaks the logo

`.ui-section:first-child` used to mean "the page's first block", because every
section was a sibling inside one container div. Now each section is the only
child of its own per-block wrapper, so **every** section matches
`:first-child`.

That reopens the specificity race the earlier fix closed. Its
`:not([data-has-background-image])` guard worked by making the two rule
families mutually exclusive *on the same element*. They now match *different*
elements and are both true at once:

- `body:has(main .ui-section:first-child[data-has-background-image])` - true
  from the Hero.
- `body:has(main .ui-section:first-child[data-surface='inverse']:not([data-has-background-image]))`
  - now also true, from some later section.

The surface-family rule carries the higher specificity (the
`html[data-theme=...]`-prefixed variants documented in the earlier fix), so it
wins and the dark-text logo renders over the image.

### Second breakage from the same cause

`src/globals/Header/Component/_header.css:212` gives
`.ui-section:first-child` a `padding-block-start` of one header height when the
header is fixed. That now applies to **every** section, not just the first.
Not yet reported, but the same root cause and fixed by the same change.

`_header.css:193` documents this coupling explicitly and predicted this exact
failure: *"Current markup is main > div > section.ui-section. Changing that
wrapper breaks this silently."*

## The fix

Put `data-block-id` on the block's own root `<section>` and delete the wrapper
divs, restoring the original DOM shape. No CSS selector changes: the existing
rules become correct again on their own. Patching the selectors to expect a
wrapper was rejected - it would spread the wrapper dependency through the
stylesheet and leave the same trap for the next structural change.

All seven block components already render the shared `Section` primitive
(`src/components/primitives/Section.tsx`) as their root, so this threads one
new optional prop through one place:

- `Section` gains an optional `blockId` prop, rendered as `data-block-id`.
  It takes explicit props rather than spreading, so the prop must be added
  by hand.
- Each block component passes `blockId={id}` to its `<Section>`. All of them
  already receive `id` in props (`<Component {...block} />` spreads it), and
  Hero already destructures it for `useEditableField`.
- Both wrapper divs are removed, keeping the existing React `key`.

### Must not break

- `useBlockSyncListener` and `useEditableField` resolve blocks with
  `[data-block-id]` and `closest('[data-block-id]')`, which keep working
  against the section.
- `src/blocks/_block-highlight.css` needs re-checking rather than assuming:
  - `[data-block-id] { position: relative }` is now redundant on the section
    (`_section.css` already sets it) but harmless.
  - `.block-sync-highlight::after` uses an absolutely positioned overlay
    specifically because the *wrapper* had no background while the inner
    `.ui-section` painted an opaque one over any outline. With the attribute
    on the section itself, the `::after` is the section's own child and paints
    above its background, so the overlay should still work - and the original
    reason for the technique goes away. Verify the highlight still reads
    correctly, especially over the Hero's `.ui-hero-bg` absolute image.
  - `scroll-margin-top` must still apply for hover-scroll.

## Build steps

- [x] Add an optional `blockId` prop to `src/components/primitives/Section.tsx`,
      rendered as `data-block-id`, and pass `blockId={id}` from all seven block
      components (`Hero`, `FeatureGrid`, `CallToAction`, `RichTextBlock`,
      `Table`, `FeaturedPost`, `BlogListing`). Remove the wrapper `<div
      data-block-id>` from `src/blocks/index.tsx` and both occurrences in
      `src/app/(frontend)/blog/BlogPageClient.tsx`.
      **Done when:** the rendered home page is `main > div > section.ui-section`
      again with `data-block-id` on the section, verified in the served HTML;
      the header shows the light logo variant over the background-image Hero;
      and only the first section carries the fixed-header top padding.

## Verify

- Load the home page (background-image Hero, header fixed + transparent) with
  an explicit theme set on `<html>`: the header logo is the light variant
  matching the nav text, not the dark-text one.
- Confirm in the served HTML that each `<section class="ui-section">` carries
  its own `data-block-id` and that no per-block wrapper div remains.
- With the header fixed, only the first section has the extra
  `padding-block-start`; later sections are not pushed down.
- In Live Preview: hovering a block row still highlights and scrolls to that
  block, the highlight outline still reads correctly over the Hero's
  background image, and clicking editable text still expands its "Edit"
  accordion and syncs edits.
- The blog page's `featuredPost` and `blogListing` blocks behave the same.
- A Hero with overlay color Light still shows the dark-text logo variant
  (that separate `data-overlay-text-color` path is unchanged).

## Verification record

Driven against the running dev server with Playwright/Chrome and plain
`curl` fetches of the served HTML:

| Check | Result |
| --- | --- |
| Rendered DOM (home) | `main > div > section.ui-section`; 0 wrapper divs; 4 sections carry `data-block-id` |
| Rendered DOM (blog) | `main > section.ui-section` directly; 0 wrapper divs; 3 sections carry `data-block-id` |
| Logo over background-image Hero | Light variant (`ui-logo__img--logo-dark` visible, `--logo` hidden) with no theme set, `data-theme=light`, and `data-theme=dark` |
| First-section padding | Only the first section (160px) carries the fixed-header offset; later sections measured 40px/80px/80px |
| Overlay color Light path | Unaffected - dark-text logo (`--logo` visible, `--logo-dark` hidden) confirmed with `data-overlay-text-color=dark` set |
| Preview highlight over Hero image | `.block-sync-highlight::after` renders with `z-index: 1`, visible over `.ui-hero-bg` |
| Live-preview accordion sync (previous fix) | All 4 checks (fresh-refresh expand, nested `features.N.title`, stays-open-in-preview, still-auto-collapses-outside-preview) re-verified passing after this change |

Automated gates: `npm run lint` (0 errors, 4 pre-existing warnings),
`npm run test:int` (8 files, 60 tests passing), `npm run build` (compiled
successfully).
