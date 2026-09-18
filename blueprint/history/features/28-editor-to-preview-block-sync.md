# Current Feature

**Title:** Editor-to-preview block sync
**Type:** Feature
**Status:** verified
**Branch:** `feature/editor-to-preview-block-sync`

## Goal

While editing a Page in the admin panel with its Live Preview tab open,
hovering any part of a block's row highlights the matching element in the
preview iframe and scrolls it into view — so editors can visually locate
which block they're editing without hunting through the rendered page.

## In scope

- Pages' top-level `blocks` field (Hero, FeatureGrid, CallToAction,
  RichTextBlock, Table) and `blogBlocks` field (Featured Post, Blog Listing).
- Hover a block's row (its label, pill, drag handle, or any of its own
  fields — collapsed or expanded) in the admin form -> the corresponding
  rendered block in the Live Preview iframe gets a visible highlight
  outline and scrolls into view; un-hover clears the highlight.
- A stable `data-block-id` marker on every rendered block, reusing the same
  `id` already used as the React `key` in `Blocks`.
- A new postMessage channel between the admin document and the live-preview
  iframe, kept distinct from `@payloadcms/live-preview`'s own message
  format.

## Out of scope

- Posts' body blocks (embedded via Lexical's `BlocksFeature` inside rich
  text) — a contentEditable/decorator-node integration, not an extension of
  this field-row mechanism. Separate future feature.
- Header, Footer, Settings globals — no block field to hover; their own
  field-level hover/scroll sync (if ever wanted) is a separate feature.
- Click-to-select-in-iframe (clicking a rendered block in the preview to
  jump to/expand its admin row) — the reverse direction of this feature,
  not requested.
- Any change to what Live Preview merges/renders (feature 15-20's data sync)
  — this feature only adds highlight/scroll signaling alongside it.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement all build steps below in one
pass without stopping for per-step approval, and do not create checkpoint
commits after individual steps. Present one review packet after every step
is complete and passing, before `/complete`.

## Build steps

- [x] 1. **Frontend block markers + message listener** - in
  `src/blocks/index.tsx`, wrap each rendered block's output in a `div
  data-block-id={id}` so every block has a stable, queryable DOM anchor.
  Add a new listener (e.g. `src/utilities/useBlockSyncListener.ts`) mounted
  in `src/app/(frontend)/[slug]/PageClient.tsx` alongside the existing
  `useScopedLivePreview` call, that listens for `window` `message` events
  carrying a new, distinctly-typed payload (not `@payloadcms/live-preview`'s
  own shape) and, on a hover message, toggles a highlight class on the
  matching `[data-block-id]` element; on a scroll message, calls
  `scrollIntoView({ behavior: 'smooth', block: 'center' })` on it. Add the
  highlight outline CSS. Guard the listener with an origin check against
  the configured server URL, matching the safety pattern already used by
  `isLivePreviewEvent`.
  **Done when:** with `/[slug]` open directly (outside an iframe) and the
  page in a browser, manually dispatching a matching `postMessage` from the
  devtools console visibly highlights and scrolls to the target block,
  proving the frontend half works independent of the admin half; `npm run
  lint` passes.

- [x] 2. **Admin-side hover bridge (redesigned)** - the original plan
  nested a per-block `ui` field (via `editAccordionField`) that walked up
  via `closest()` to its own block row. That broke silently for any block
  whose row hadn't been expanded yet: Payload's `BlocksField`/`BlockRow`
  can defer rendering a collapsed row's own custom Field components (a
  documented lazy/shimmer optimization for rows with many fields), so the
  per-block component simply never mounted until the row was opened once -
  confirmed by reading `@payloadcms/ui`'s `BlockRow.js` source, not
  guessed. Replaced with **one global bridge**,
  `src/custom/block-hover-sync/Component.tsx`, added as a top-level `ui`
  field on `Pages` (`src/collections/Pages/config.ts`'s Content tab, sibling
  to `blocks`) rather than nested inside any block. It uses
  `useAllFormFields()` for the full form state and a single
  document-level `mouseover`/`mouseout` listener matching Payload's own
  deterministic, always-rendered row wrapper id
  (`${field}-row-${index}`, e.g. `blocks-row-0`) - a DOM anchor that exists
  unconditionally regardless of collapse/lazy-render state, sidestepping
  the whole issue. Hovering any part of a row (not just a nested
  "Edit" accordion) now triggers highlight+scroll together via a shared
  `src/utilities/postToLivePreviewIframe.ts` helper that locates the
  admin's live-preview `<iframe id="live-preview-iframe">` (confirmed via
  `@payloadcms/ui`'s `LivePreviewWindow.js` source) and posts to its
  `contentWindow`.
  **Done when:** with a Page open in the admin and its Live Preview tab
  visible, hovering any part of a block's row - including one that has
  never been expanded in that session - highlights and scrolls to that
  block in the iframe; un-hovering clears the highlight.

- [x] 3. **Scroll on hover, not on expand** - dropped the separate
  Edit-accordion-expand scroll trigger (and its now-unused `block-scroll`
  message type) once hover was changed to trigger both highlight and
  scroll together - simpler, and no longer tied to the per-block nested
  component that Step 2's redesign removed.
  **Done when:** hovering a block's row scrolls the Live Preview iframe to
  it in the same action as the highlight.

- [x] 4. **Extend to `blogBlocks`** - the Step 2 bridge already covers it:
  it matches both `blocks-row-*` and `blogBlocks-row-*` ids from one global
  component, needing no separate wiring in
  `src/collections/Pages/blogBlocks/`. Only the frontend `data-block-id`
  marker needed adding, since `BlogPageClient.tsx` renders `blogBlocks`
  inline rather than through the shared `Blocks` dispatcher from Step 1.
  **Done when:** hover-highlight-and-scroll works for Featured Post and
  Blog Listing blocks on the `/blog` page's admin editor.

- [x] 5. **Fix the whole admin window scrolling to the bottom on hover** -
  reported: hovering the block array (any row, expanded or not) scrolled
  the entire outer browser window - not the preview iframe - to the
  bottom. Real cause (confirmed via spec, not guessed): `Element.
  scrollIntoView()` walks up through ancestor *browsing contexts* - when
  called inside the live-preview iframe, it can also scroll the *parent
  admin window* to bring the iframe element itself more fully into view.
  Since `useBlockSyncListener.ts` called `target.scrollIntoView(...)`
  inside the iframe on every hover, every single hover was also nudging
  the outer admin page. Two intermediate attempts before finding this
  didn't help and are left in as real improvements regardless: (a)
  `BlockHoverSync` switched from the reactive `useAllFormFields()` to the
  non-reactive `useForm().getField()`, since it never needs to re-render
  for hovering; (b) a same-block scroll dedup, tracking the last
  block actually scrolled to separately from the highlight (which still
  clears on every `block-hover-clear`) so leaving and returning to the same
  row doesn't reset it. The actual fix: replace `scrollIntoView` with a new
  `scrollWithinThisWindow()` helper that computes the target's offset and
  calls `window.scrollTo(...)` directly - scoped to the current window only,
  never crossing into a parent frame.
  **Done when:** hovering any block row, in the admin with the Live Preview
  tab open, scrolls only the preview iframe's own content - the outer admin
  browser window never moves - whether or not that block's "Edit" accordion
  is expanded.

- [x] 6. **Persistent "selected" highlight independent of hover** - the
  hover highlight disappears the moment the mouse leaves the row (e.g. to
  type in one of its fields), so a block being actively edited shows no
  indicator in the preview unless the cursor happens to still be over its
  row. Add a `block-select`/`block-deselect` message pair alongside
  `block-hover`/`block-hover-clear` (`blockSyncMessages.ts`), driven by a
  block's nested "Edit" accordion (`block-edit-collapsible`) expand/collapse
  state - global, not per-block-mounted, using a `MutationObserver` in
  `BlockHoverSync` watching `class` changes on `.block-edit-collapsible >
  .collapsible` anywhere in the document (plus one initial scan on mount,
  since a MutationObserver only reports *changes*, not whatever's already
  expanded when it starts observing), resolving the row id and blockId the
  same way the existing hover handler does. `useBlockSyncListener.ts`
  tracks hovered and selected block ids separately (a block can be
  hovered, selected, both, or neither - reuses the same
  `.block-sync-highlight` visual treatment for both, per discussion, rather
  than a second visual language) and shows the highlight when either is
  true; scrolls to a block the first time it becomes selected, same dedup
  as hover.
  **Done when:** expanding a block's "Edit" accordion highlights and
  scrolls to it in the preview and the highlight stays even after the
  mouse leaves the row; collapsing it (with the mouse elsewhere) clears
  the highlight; a second block can be selected independently while the
  first stays selected.

## Files / areas

- `src/blocks/index.tsx` - block wrapper + `data-block-id`
- `src/app/(frontend)/[slug]/PageClient.tsx`,
  `src/app/(frontend)/blog/BlogPageClient.tsx` - mount the frontend listener
  and (for blog) the `blogBlocks` `data-block-id` markers
- `src/utilities/useBlockSyncListener.ts` - frontend message listener,
  highlight toggle, scroll call
- `src/utilities/postToLivePreviewIframe.ts` - shared admin-side helper to
  locate the iframe and post a message
- `src/custom/block-hover-sync/Component.tsx` - the one global hover/select
  bridge
- `src/collections/Pages/config.ts` - top-level `blockHoverSync` ui field
  wiring the bridge in
- `src/custom/admin-timestamps/styles.css` - the "selected" block row's
  border in the admin matches the iframe highlight's exact color/width
  (`#3b82f6`, 2px) rather than the site's editable secondary color
- new highlight-outline CSS (`src/blocks/_block-highlight.css`)
- `tests/int/blockSyncMessages.int.spec.ts` - unit coverage for
  `isBlockSyncEvent`

## Data / contracts

- New postMessage payload shapes (not persisted, not part of any schema):
  - `{ type: 'block-hover'; blockId: string }`
  - `{ type: 'block-hover-clear' }`
  - `{ type: 'block-select'; blockId: string }`
  - `{ type: 'block-deselect'; blockId: string }`
- `blockId` is the block's existing Payload-assigned `id` string — the same
  value already used as the React `key` in `Blocks`; no new field is added
  to any collection or block config.
- Message origin must be checked against the same server URL used
  elsewhere (`getServerSideURL()`/`serverURL`), so a foreign frame can't
  trigger highlight/scroll.

## Testing

- No test runner in this repo covers admin-panel interaction or
  cross-window postMessage (Vitest is unit-level only; Playwright is
  configured but has no browser tests written yet) — verification here is
  manual, via each step's browser-observable "Done when."
- If Step 1 or 2 produces a small pure function (e.g. building the message
  payload, or resolving a block id from a path), add a focused Vitest unit
  test for it, following the existing `Pagination`'s `buildHref` precedent
  — don't force a test around DOM/postMessage interaction itself.

## Notes for the AI

- Verify in Step 1 that wrapping each block in an extra `data-block-id` div
  doesn't disturb block spacing driven by the Settings whitespace tokens
  (`sectionScale`/`containerScale`, feature 22) — check visually in the
  browser. Keep the wrapper (needed for `getBoundingClientRect`/
  `scrollIntoView` to work); don't switch to a `display: contents` wrapper,
  since that removes the element's box entirely.
- Keep the new message `type` values distinct from
  `@payloadcms/live-preview`'s own message shape so neither
  `isLivePreviewEvent`/`mergeData` nor this feature's listener ever
  misinterprets the other's messages.
- This is admin-UX only and must be inert on the public frontend outside
  live preview — the listener simply never receives messages when the page
  isn't rendered inside the admin's iframe.
- The overview's tech-stack line still says `@payloadcms/live-preview-react`;
  the repo actually only depends on `@payloadcms/live-preview` with a
  custom `useScopedLivePreview` hook (`src/utilities/useScopedLivePreview.ts`).
  Build against what's actually installed.
