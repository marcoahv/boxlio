# Current Feature

**Title:** Live Preview field-focus bridge: closes early, loses fields, won't settle, and only scrolls to the block
**Type:** Fix
**Status:** verified
**Branch:** fix/keep-block-field-sync-open-on-admin-click

## The problem

Clicking any inline-editable field in the Live Preview iframe (a Hero
heading, a FeatureGrid item, a Post's `body` paragraph - anything wired
through `useEditableField`/`EditableRichText`) is supposed to auto-expand the
matching block's "Edit" accordion and scroll/highlight the field in the admin
sidebar (`block-field-focus`, handled in
`src/custom/block-field-sync/Component.tsx`). Manual testing against real
blocks surfaced seven distinct defects across the focus-sync bridge, found and
fixed in sequence as each was reproduced:

1. **Sidebar click closes the field it just revealed.** Clicking into the
   now-expanded sidebar field to edit it there immediately collapsed the
   accordion again.
2. **The fix for #1 stopped working after bouncing focus between the iframe
   and the sidebar.** Editing from the iframe again (which round-trips a
   `block-rich-text-edit`) remounts the sidebar's own Lexical field; a cached
   DOM reference to the pre-remount node then never matches anything again.
3. **Buttons and grid items didn't scroll to on the first click into a
   block.** A field nested behind an array row (and, for a Hero/CallToAction
   button, an additional `row`-type field grouping `label` beside `url`) sits
   behind three or four of Payload's own lazy-render gates - the code
   mistook "still rendering" for "must be on another tab" and switched away,
   unmounting the real content and never finding it within the timeout.
4. **More than one block stayed expanded at once.** The bridge only ever
   collapsed accordions *it* had auto-expanded, never one the editor (or an
   earlier pass of this same bridge) had left open by other means.
5. **Even after #3, a block sitting low in the sidebar still failed on the
   very first click** - the nested field's own render gate needs the area to
   already be near the viewport to fire, but nothing scrolled there until
   the field was already found. Clicking a shallower field in the same block
   first "fixed" it only as an accidental side effect of that scroll.
6. **The reverse direction was block-level only.** Focusing a field in the
   admin sidebar already scrolled the Live Preview iframe (feature 28's
   hover/select sync), but only to the *block* containing it, not the exact
   element - the field-level precision the forward direction (iframe click ->
   admin scroll) has always had.
7. **The new field-level scroll from #6 landed the element under the site's
   fixed header.** `[data-block-id]` already has its own
   `scroll-margin-top: var(--header-offset)` for exactly this; the new,
   finer-grained `[data-editable-field]` target didn't.

## Root causes

- **#1/#2:** `block-field-blur`'s handler (`Component.tsx`) starts a
  `BLUR_GRACE_MS` (150ms) timer that collapses everything in
  `ownedRef.current` unless a newer `block-field-focus` supersedes it first.
  Clicking the sidebar moves real browser focus out of the iframe, firing
  that same blur - the grace-period check needs to recognize "focus landed
  in the field's own revealed element," not just "a newer iframe focus
  arrived." Caching the resolved DOM element (`highlightedRef.current`) for
  that check breaks once Payload's Lexical field remounts it (forced by our
  own `initialValue` override on every iframe-originated edit).
- **#3/#5:** Every level between a block's row and a nested field - Payload's
  native block/array-row `Collapsible` and our own "Edit" accordion alike -
  only mounts its own fields once its `RenderIfInViewport` wrapper
  (`@payloadcms/ui`'s `forms/RenderFields`) has observed real intersection
  geometry via `IntersectionObserver` (`rootMargin: 1000px`). A field several
  levels deep needs that cascade to complete across multiple sequential
  observers, and none of them can fire for content that's never been near
  the viewport in the first place.
- **#4:** `reconcileExpanded`'s own `owned` tracking is deliberately scoped
  to "what this component itself expanded," by design (so it never fights
  the editor's own manual actions) - but nothing else in the bridge ever
  swept for *other* open blocks.
- **#6:** `src/custom/block-hover-sync/Component.tsx` (the admin -> iframe
  half of the bridge) only ever tracked hover and "Edit"-accordion
  open/close, both block-level (`data-block-id` only) - it never listened
  for a specific field gaining focus at all.
- **#7:** `src/blocks/_block-highlight.css`'s `scroll-margin-top` offset for
  the site's fixed header was only ever defined on `[data-block-id]`.

## The fix

#1-#5 are all in `src/custom/block-field-sync/Component.tsx`; #6 spans the
admin -> iframe side of the bridge (see below).

- **#1/#2:** Inside `block-field-blur`'s grace-period timeout, re-resolve the
  field's *current* live DOM element (`resolveFieldTarget` +
  `findFieldElement`, not the cached `highlightedRef.current`) and skip the
  collapse when `document.activeElement` is inside it.
- **#3:** Replace the fixed "try another tab as soon as nothing's found"
  behavior with a time-based reserve (`TAB_SWITCH_RESERVE_MS`): the
  tab-switch fallback only runs once the retry loop is within the last
  second of its overall budget, giving Payload's render cascade the rest of
  that budget to settle on the correct, already-active tab first.
- **#4:** Added `collapseOtherBlockAccordions`, called at the start of every
  `block-field-focus`: collapses every top-level block's own "Edit"
  accordion except the current one, regardless of who opened it.
  `EDIT_ACCORDION_SELECTOR` only ever matches a top-level block's own
  accordion, so this can't reach into the current block's own nested fields.
- **#5:** `expandTowardField` now scrolls (`behavior: 'auto'`, not smooth)
  toward the deepest level found so far on every retry pass, not just once
  the target field is finally located - pulling not-yet-rendered nested
  content near the viewport early enough for its own `RenderIfInViewport`
  gate to actually fire.
- **#6:** New `admin-field-focus` message
  (`src/utilities/blockSyncMessages.ts`), mirroring `block-field-focus` in
  the opposite direction:
  - `src/custom/block-hover-sync/Component.tsx` adds a `focusin` listener
    that, for a plain text/textarea field (`[id^="field-"]` - richText
    fields don't render this id, so they fall back to the existing
    block-level scroll), resolves the full form path, walks up to the
    top-level block row via a new `findTopLevelRowAncestor`
    (`src/utilities/blockRowLookup.ts` - a plain `closest(ROW_SELECTOR)`
    would stop at a nested array row instead), and posts `{ blockId,
    fieldPath }` (the path relative to the block, stripped of its
    `fieldName.rowIndex.` prefix - same convention `useEditableField`
    already uses forward).
  - `src/utilities/useBlockSyncListener.ts` (iframe side) resolves
    `[data-block-id="..."] [data-editable-field="..."]` - both markers
    `useEditableField`/`EditableRichText` already render - and scrolls to it
    with the existing `scrollWithinThisWindow` helper (never leaks the
    scroll into the parent admin window, same as `block-select` already
    relies on).
  - Scoped to Pages only, matching `block-hover-sync`'s existing scope -
    Posts' blocks embed in Lexical rich text and never render a matching row
    id (see that file's own note).
- **#7:** Added the same `scroll-margin-top: var(--header-offset, 0px)` rule
  to `[data-editable-field]` in `src/blocks/_block-highlight.css`.

Not changed: `useEditableField.ts`, `EditableRichText.tsx` - both already
post the right messages; every gap was on the admin-side listener deciding
when to collapse, expand, give up, or (for #6) notice a field was focused at
all.

## Build steps

- [x] 1. Fix the sidebar-click auto-collapse (re-resolve fresh, check
  `document.activeElement`, robust across iframe/sidebar focus bouncing).
  **Done when:** clicking a revealed sidebar field keeps it open and
  editable, including after repeatedly bouncing focus between the iframe
  and the sidebar.
- [x] 2. Fix nested fields (array rows, `row`-type field groupings) not
  reliably scrolling to on the first click into a block, via the time-based
  tab-switch reserve plus progressive scroll-toward-chain.
  **Done when:** a Hero/CallToAction button label and a FeatureGrid item
  title both scroll to and expand correctly as the very first interaction
  with that block after a hard reload, regardless of the block's position
  in the sidebar.
- [x] 3. Collapse every other block's "Edit" accordion on focus, so only one
  block is ever expanded at a time.
  **Done when:** clicking through fields across several different blocks
  leaves exactly one accordion open at any moment.
- [x] 4. Reverse-direction field-level scroll: focusing a plain text/textarea
  field in the sidebar scrolls the iframe to that exact element, not just
  its block.
  **Done when:** on a Page, clicking into a Hero heading, a Hero button
  label, or a FeatureGrid item's title/body field in the admin sidebar
  scrolls the Live Preview iframe to that specific rendered element, landing
  below the site's fixed header rather than underneath it. Rich text fields
  (Post `body`, `RichTextBlock` content) still get the existing block-level
  scroll, unchanged.

## Verify

With the dev server running and a Page (with Hero, FeatureGrid, CallToAction
blocks) or Post open in Live Preview, after a hard browser refresh:

1. Click a Hero heading - sidebar scrolls to and highlights it; only Hero's
   accordion is open.
2. Click into that field in the sidebar - stays open and editable.
3. Bounce focus between the iframe and sidebar a few times on the same
   field - still stays open each time.
4. As the very first click on a fresh page, click a Hero button label, then
   (separately, after reload) a FeatureGrid item title - both scroll to and
   expand correctly without clicking anything else in that block first.
5. Click a field in a different block - the previous block's accordion
   collapses and only the new one is open.
6. On a Page, click directly into a Hero heading and then a Hero button
   label in the admin sidebar - the Live Preview iframe scrolls to each
   specific element in turn, not just to the Hero block generally. Repeat
   for a FeatureGrid item's title.

No automated browser-test command is configured for this project; verified
manually against the running app.
