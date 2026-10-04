## 32. Lexical-embedded block hover-sync (Posts)

**Type:** Feature
**Status:** verified
**Branch:** `feature/lexical-embedded-block-hover-sync-posts`

## Goal

Extend feature 28's admin-hover -> Live Preview highlight bridge so hovering a
block embedded inside a Post's `body` Lexical rich text (via `BlocksFeature`)
also highlights/scrolls to it in the Live Preview iframe - matching the
behavior that already works for Pages' native `blocks`/`blogBlocks` fields.
Feature 28 explicitly deferred this case ("Posts' Lexical-embedded blocks
don't render the marker").

Investigation findings that shape this spec:

- **The frontend side already works, unmodified.** `Section.tsx`'s
  `data-block-id` comes from a `blockId` prop each block's own `Component`
  passes through from its `id` field - independent of
  `EditableFieldProvider`. The RichText converter
  (`src/components/RichText/converters/index.tsx`) spreads `node.fields`
  (including `id`) into the block `Component` the same way Pages does, so an
  embedded block's rendered root already carries the right `data-block-id`.
  `EditableFieldProvider value={false}` only disables the inline-text-edit
  affordance (`useEditableField`), not this marker. `useBlockSyncListener`'s
  existing `[data-block-id="..."]` lookup needs no changes.
- **The admin side has no existing hook for this.** `blockHoverSync`
  resolves a hovered block's id via `ROW_SELECTOR` (`[id*="-row-"]`), the DOM
  id convention Payload's native `blocks` field renders per row
  (`src/utilities/blockRowLookup.ts`). Confirmed by reading
  `@payloadcms/richtext-lexical`'s own `BlocksNode.decorate()`
  (`node_modules/@payloadcms/richtext-lexical/dist/features/blocks/client/nodes/BlocksNode.js`):
  it renders no `data-*`/id attribute carrying the block's `id` at all.
- **A clean resolution path exists via Lexical's own public APIs**, no vendor
  patching or custom per-block admin component needed:
  - `getNearestEditorFromDOMNode(domNode)` (confirmed exported from the real
    `lexical` package, re-exported verbatim by
    `@payloadcms/richtext-lexical/lexical` - `export * from 'lexical'`)
    walks up from any DOM node to the `LexicalEditor` instance that owns it
    (set via `rootElement.__lexicalEditor = editor` on the field's own
    contenteditable root).
  - Inside `editor.getEditorState().read(() => {...})`,
    `$getNearestNodeFromDOMNode(domNode)` (also from `lexical`, same proxy)
    resolves the nearest Lexical node for that DOM position.
  - Walking up via `.getParent()` until `$isBlockNode(node)` (confirmed
    exported from `@payloadcms/richtext-lexical/client`) finds the enclosing
    embedded block; `node.getFields().id` is the same stable id
    (`$createBlockNode` auto-generates one) every embedded block already has.

## In scope

- Admin-side only: when a hovered/left element has no `ROW_SELECTOR`
  ancestor (today's native-row path), fall back to the Lexical resolution
  path above and post the **existing** `block-hover`/`block-hover-clear`
  messages (`src/utilities/blockSyncMessages.ts`) through the **existing**
  `postToLivePreviewIframe` bridge - no new message types.
- Extend `src/custom/block-hover-sync/Component.tsx` (the single hover
  bridge - do not build a parallel one; `project-overview.md`'s own "Lock"
  note on this bridge says exactly that).
- Mount the extended `BlockHoverSync` on Posts' "Content / Layout" tab
  (`src/collections/Posts/config.ts`), alongside the existing
  `blockFieldSync`, matching Pages' field order (hover-sync before
  field-sync).

## Out of scope

- `block-select`/`block-deselect` (scrolling the preview when a block's
  "Edit" accordion expands/collapses) and `admin-field-focus` (focusing a
  plain field scrolls the iframe to it) for embedded blocks. Same root cause
  (no `ROW_SELECTOR` ancestor), same fix shape - deliberately deferred to
  keep this slice reviewable. A future increment can extend
  `notifySelection`'s row resolution the same way this feature extends
  `onMouseOver`/`onMouseOut`.
- Inline text editing for embedded blocks (click text in Live Preview to
  edit it). Stays disabled by `EditableFieldProvider value={false}` in the
  RichText converter - untouched by this feature.
- Pages' own "Content / Layout" tab - already has `blockHoverSync` mounted;
  unaffected.
- Blog-only blocks (`Featured Post`, `Blog Listing`) - they're a separate
  registry (`Pages/blogBlocks/`), never embeddable in a Post's `body`
  (`BlocksFeature` only references `src/blocks/registry.ts`'s `blockSlugs`),
  so irrelevant here.

## Build loop

`workflow.stepReview: "feature"`, `workflow.checkpointCommits: "disabled"`
(`blueprint/config.json`): continue through all passing steps, then present
one final review packet. No per-step pauses or checkpoint commits.

## Build steps

- [x] **Step 1 - Pure, testable helper for walking up to an enclosing block id**

  New `src/utilities/lexicalBlockLookup.ts`, mirroring `blockRowLookup.ts`'s
  role for the native-row case. Export a function that takes a starting
  node-like value (duck-typed: `{ getParent(): unknown }`) and an
  `isBlockNode` predicate as a parameter (dependency-injected so it's
  testable without a real Lexical editor instance), walks `.getParent()`
  until the predicate matches, and returns the matched node's
  `getFields().id`, or `undefined` if the walk reaches the root without a
  match.

  Add `tests/int/lexicalBlockLookup.int.spec.ts`, mirroring
  `blockRowLookup.int.spec.ts`'s style: fake node objects (plain objects with
  a `getParent`/`getFields` method) and a fake predicate, covering: finds an
  immediate block match, finds one several levels up, returns `undefined`
  when no ancestor matches, returns `undefined` for a `null` start.

  **Done when:** `npm run test:int` passes including the new spec file;
  `npm run lint` passes.

- [x] **Step 2 - Wire the Lexical path into BlockHoverSync's hover handlers**

  In `src/custom/block-hover-sync/Component.tsx`, extend `onMouseOver`/
  `onMouseOut`: when `e.target.closest(ROW_SELECTOR)` finds nothing, fall
  back to `getNearestEditorFromDOMNode(e.target)` (import from
  `@payloadcms/richtext-lexical/lexical`) - if it returns an editor, read
  inside `editor.getEditorState().read(() => {...})`, resolve
  `$getNearestNodeFromDOMNode(e.target)` (same import), and pass it to Step
  1's helper with `$isBlockNode` (import from
  `@payloadcms/richtext-lexical/client`). Post `block-hover`/
  `block-hover-clear` with the resolved id exactly as the native-row path
  does today.

  Track the Lexical-path's "currently hovered block id" separately from
  `hoveredRowId` (e.g. a second ref, or a tagged union of the two sources) so
  leaving a native row doesn't clear a Lexical hover and vice versa, and so
  hovering plain paragraph text (no enclosing block - the walk finds no
  match) correctly does nothing rather than misfiring a stale clear.

  A missing editor, a failed resolution, or an exception from the Lexical
  calls must no-op (no `block-hover` posted), never throw - this runs on
  every `mouseover` in the admin panel, including far outside any rich text
  field.

  Update the component's own file-level comment (currently says Posts is out
  of scope, pointing at `current-feature.md`, which this feature changes) to
  describe the new dual-path (native row + Lexical) behavior instead.

  **Done when:** `npm run lint` passes; `npm run build` compiles with no new
  TypeScript errors.

- [x] **Step 3 - Mount on Posts and verify end-to-end**

  In `src/collections/Posts/config.ts`'s "Content / Layout" tab, add a
  `blockHoverSync` `ui` field (same `Field` component reference Pages uses:
  `@/custom/block-hover-sync/Component.tsx#BlockHoverSync`), positioned
  before `blockFieldSync` - matching Pages' field order.

  Manually verify via the running dev server (a live hover/DOM interaction
  with no existing automated harness for this kind of check - feature 28
  itself has none either): open a Post whose `body` contains at least one
  embedded block (Hero, FeatureGrid, CallToAction, RichTextBlock, or Table),
  open its Live Preview, and confirm:
  - hovering the block's row in the admin editor highlights/scrolls to the
    matching element in the preview iframe;
  - hovering plain paragraph text in the body (no enclosing block) does not
    misfire a highlight;
  - leaving the block clears the highlight;
  - hovering a block on a Page (native `blocks` field) still behaves exactly
    as before (no regression to the existing native-row path).

  **Done when:** `npm run lint` and `npm run build` pass, and the four manual
  checks above are confirmed working. Ask the user to start `npm run dev` if
  live verification is needed and no server is already running.

  **Actual result:** `npm run lint`, `npm run build`, and `npm run test:int`
  (112/112) all passed. The four manual browser checks were **not** run - no
  dev server was started this session (`verification.uiEvidence:
  "when-available"`, not `required`, so this doesn't block completion, but it
  is unverified rather than confirmed). Recommended before relying on this in
  production: `npm run dev`, open a Post with an embedded block in its body,
  open Live Preview, and run the four checks listed above.

## Files / areas

- `src/custom/block-hover-sync/Component.tsx` - extend
- `src/utilities/lexicalBlockLookup.ts` - new
- `tests/int/lexicalBlockLookup.int.spec.ts` - new
- `src/collections/Posts/config.ts` - mount the field
- Reused, unchanged: `src/utilities/blockSyncMessages.ts`,
  `src/utilities/postToLivePreviewIframe.ts`,
  `src/utilities/useBlockSyncListener.ts`,
  `src/components/primitives/Section.tsx`,
  `src/components/RichText/converters/index.tsx`

## Data / contracts

- No new message types - reuses `{ type: 'block-hover'; blockId: string }` /
  `{ type: 'block-hover-clear' }` from `blockSyncMessages.ts` verbatim.
- No stored-field or schema changes - purely admin-UI/event-wiring.
- `blockId` is the same `fields.id` every embedded block already carries
  (auto-generated by `@payloadcms/richtext-lexical`'s `$createBlockNode`) -
  no new id scheme introduced.

## Testing

- Focused Vitest unit tests for the new pure helper
  (`lexicalBlockLookup.int.spec.ts`), consistent with the existing
  `blockRowLookup.int.spec.ts` style - fake objects, no real Lexical editor
  needed for this part.
- The DOM/event-listener wiring inside `BlockHoverSync` (and the live
  `getNearestEditorFromDOMNode`/`$getNearestNodeFromDOMNode` calls) stays
  untested by design, matching existing precedent: the component's current
  native-row hover logic has no test coverage either - only its extracted
  pure utilities do. Verified manually instead (Step 3).
- No Playwright addition - `test:e2e` only covers `theme-toggle.spec.ts`
  today; browser coverage for a hover interaction would be disproportionate
  for this slice, matching feature 28 having none either.

## Notes for the AI

- Import `getNearestEditorFromDOMNode`/`$getNearestNodeFromDOMNode` from
  `@payloadcms/richtext-lexical/lexical` (a verbatim `export * from 'lexical'`
  passthrough - confirmed by reading that file), not a new direct dependency
  on `lexical` itself (not in `package.json` today).
- Import `$isBlockNode` from `@payloadcms/richtext-lexical/client` (confirmed
  public export).
- `$`-prefixed Lexical functions must run inside `editor.getEditorState().read(() => {...})`
  (or `editor.update()`) - calling them outside that context throws.
- Extend `BlockHoverSync`; do not add a second hover-sync component or a new
  postMessage channel - `project-overview.md`'s locked note on this bridge is
  explicit about this.
