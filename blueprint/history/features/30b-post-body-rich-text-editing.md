# Current Feature

**Branch:** feature/post-body-rich-text-editing
**Status:** verified

## Goal

Extend feature 30a's inline rich-text editing (click-to-edit prose plus a
floating Bold/Italic/Link toolbar) to a Post's `body` field, so an editor can
edit a Post's rich text directly inside the admin's Live Preview iframe the
same way they already can for a `RichTextBlock`. This is build-plan item 30b,
the second of two slices under parent item 30 ("WYSIWYG rich text editing in
the live preview iframe").

Unlike 30a's field, Post's `body` has `BlocksFeature` enabled
(`src/collections/Posts/config.ts`), so page-builder blocks (Hero,
FeatureGrid, CallToAction, Table, RichTextBlock) can be embedded inside it.
This is the first time content rendered through `EditableRichText` can
contain a `block`-type node, and that combination has two concrete failure
modes that this spec's build step exists specifically to close - see Notes
for the AI.

## In scope

- `Post.body` only.
- Editing the text of, and toggling Bold/Italic/Link on, `paragraph`,
  `heading` (h1-h6), and `quote` nodes rendered inside `body` - the exact
  mechanism 30a already built (`EditableRichText`, `richTextNodeSync`, the
  `block-rich-text-edit` message), reused unchanged.
- Making the shared rich-text `blocks` converter
  (`src/components/RichText/converters/index.tsx`) safe to render inside an
  editable field for the first time: every top-level `block` node must still
  occupy exactly one DOM position (regardless of whether the embedded
  page-builder block itself renders anything), and an embedded block's own
  fields must never attempt to sync through the inline-editing bridge.
- The admin-side `blockFieldSync` UI field on Posts' Content tab (mirrors
  Header/Footer/Settings), and the `EditableFieldProvider`/
  `useIsLivePreviewActive` wiring in `PostClient.tsx`, scoped to the body
  section only.

## Out of scope

- Every other Post field (title, summary, author, category, date,
  featuredImage, the breadcrumbs/headerAppearance/bodyAppearance surface
  controls, SEO) - stays exactly as today, not wired for inline editing.
  "Posts stay out of scope" (28/29a) still holds for all of them; only `body`
  gains editability in this feature.
- Page-builder blocks embedded inside `body` stay entirely non-editable
  through this feature - not through the new rich-text toolbar, and not
  through their own existing per-field inline editing (a Hero's heading, a
  FeatureGrid item's text, etc.). Same exclusion the build plan states for
  30b, made concrete by this spec's build step.
- Editor-to-preview block hover/select sync (feature 28) for blocks embedded
  in a Lexical field - Post's body has no top-level `blocks`-array admin row
  to hover in the first place. Unchanged; still a separate future feature per
  28's own note about Posts' Lexical-embedded blocks.
- Every mark besides Bold/Italic/Link, any block-level structural change
  (new paragraph, heading level, lists, alignment, blockquote creation),
  `list`/`upload`/`relationship`/`horizontalrule` node types - all stay
  exactly as 30a already scoped them.
- The pre-existing `UploadJSXConverter` behavior of returning `null` for an
  unpopulated/missing media relation (confirmed in
  `@payloadcms/richtext-lexical`'s own source) - an inherited latent risk in
  the rich-text pipeline 30a already shipped, not introduced or fixed here.

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled` (`blueprint/config.json`): implement the build step below without
stopping for individual approval, then present one review packet covering
it. No intermediate commit - `/complete` creates the final commit after that
review.

## Build steps

- [x] 1. **Wire Post's `body` field into the inline rich-text editing system,
  guarding the shared block converter so it's safe there**
  - `src/components/RichText/converters/index.tsx`: change
    `buildBlockConverters` so each block's converter wraps
    `<Component {...node.fields} />` in `<span className="contents">` (a
    Tailwind `display: contents` utility - no inline styles, no layout
    change) containing `<EditableFieldProvider value={false}>`. Import
    `EditableFieldProvider` from `@/utilities/EditableFieldContext`. The
    `<span>` guarantees one DOM child per top-level `block` node even when
    the embedded component itself renders `null`; the nested provider resets
    `useIsEditableField()` back to `false` for everything the embedded
    block renders, regardless of what the surrounding `body` field's own
    editability is.
  - `src/collections/Posts/config.ts`: add a `blockFieldSync` UI field
    (`type: 'ui'`, `admin.components.Field:
    '@/custom/block-field-sync/Component.tsx#BlockFieldSync'`) to the
    Content tab's `fields`, alongside `body` - the same field Header,
    Footer, and Settings already mount for their own top-level fields. Do
    not add `blockHoverSync` - Posts have no top-level `blocks`-array admin
    row to hover (see Out of scope).
  - `src/app/(frontend)/blog/[slug]/PostClient.tsx`: add
    `const isEditable = useIsLivePreviewActive({ type: 'collection',
    collectionSlug: 'posts' })`. Wrap only the body `Section`/`Container`
    (not the whole component) in `<EditableFieldProvider value={isEditable}>`,
    and inside it replace `<div className="ui-prose"><RichText
    data={data.body} /></div>` with `<EditableRichText blockId="body"
    fieldPath="body" data={data.body} className="ui-prose" />` - the same
    `blockId === fieldPath` synthetic-id convention `FooterClient.tsx`
    already uses for Settings' borrowed `siteName`. Remove the now-unused
    `RichText` import.
  - **Done when**, with the dev server running and a Post open in Live
    Preview:
    - A plain paragraph/heading/quote in `body` is click-to-edit, the
      floating Bold/Italic/Link toolbar appears on selection, and an edit
      (including a toggled mark and a created link) round-trips into the
      sidebar's `body` field live and survives Save - same verification 30a
      already did, now for Post.
    - A Hero or FeatureGrid block embedded in `body` with real content
      renders normally, but clicking its heading/label text in Live Preview
      does nothing (no caret, no toolbar, no sidebar sync) - confirms the
      embedded block's own fields never activate the bridge.
    - A `Table` or `FeatureGrid` block embedded in `body` with zero
      rows/features, placed between two paragraphs, renders (or renders
      nothing, per that block's own existing empty-state guard) without
      breaking the paragraphs around it: both remain independently
      click-to-edit, and editing each one syncs to its own correct node in
      the saved `body.root.children` after Save - not to each other's slot,
      and not silently dropped.
    - Verified by manual run-through and screenshot at `/check` - no
      automated browser-test command is configured for this project.

## Files / areas

- `src/components/RichText/converters/index.tsx` - guard `buildBlockConverters`
- `src/collections/Posts/config.ts` - add `blockFieldSync` UI field
- `src/app/(frontend)/blog/[slug]/PostClient.tsx` - live-preview wiring +
  `EditableRichText` swap
- Reference only, unchanged: `src/components/RichText/EditableRichText.tsx`,
  `src/utilities/richTextNodeSync.ts` (`EDITABLE_NODE_TYPES` already excludes
  `block`), `src/utilities/blockSyncMessages.ts`,
  `src/custom/block-field-sync/Component.tsx` (`resolveFieldTarget` already
  falls back to a top-level field when `blockId` matches no row),
  `src/utilities/EditableFieldContext.tsx`, `src/utilities/useIsLivePreviewActive.ts`,
  `src/blocks/registry.ts`

## Data / contracts

- No new `BlockSyncMessage` variant - `block-rich-text-edit`,
  `block-text-edit`, `block-field-focus`, `block-field-blur` are all reused
  as-is from 30a.
- `EditableRichText`'s `blockId`/`fieldPath` for `body` are both the literal
  string `'body'` - a synthetic id for a top-level field with no array row,
  matching the convention `FooterClient.tsx` already established for
  Settings' `siteName`. `resolveFieldTarget` in `block-field-sync/Component.tsx`
  needs no change: `findRowElementForBlockId('body', ...)` never matches a
  real row (block/array row ids come from Payload's own generated ids, never
  the literal string `body`), so it falls through to its existing
  `getField(fieldPath)` branch.
- The `blocks` rich-text converter now always renders exactly one DOM
  element per top-level `block` node, and that element always carries
  `EditableFieldProvider value={false}` for its subtree - both true
  regardless of what the embedded page-builder block itself renders,
  including `null`.

## Testing

No new pure logic - the build step is JSX composition (a converter wrapper),
a config field addition, and component wiring, all UI/integration surfaces
per the project's testing scope rule
(`blueprint/context/coding-standards.md`). `npm run test:int`'s existing
suite (`blockSyncMessages`, `richTextNodeSync`) stays green untouched. No
Browser tests command is configured for this project, so the step's UI
behavior is verified by manual run-through and screenshot evidence during
`/check`, per the three scenarios in the build step's Done when.

## Notes for the AI

- Why the `<span className="contents">` wrapper is required, not
  defensive-only: `@payloadcms/richtext-lexical`'s own
  `convertLexicalNodesToJSX` (`dist/features/converters/lexicalToJSX/converter/index.js`)
  ends with `jsxArray.filter(Boolean)` - any top-level node whose converter
  returns `null` is dropped from the rendered array entirely, not rendered
  as an empty placeholder. `FeatureGrid` (`!features?.length`), `Table`
  (`!rows?.length`), and `RichTextBlock` (`!content`) - all embeddable in
  `body` via `blockSlugs` - can each return `null` from ordinary, valid
  editor state (an editor adds one of these blocks before filling it in).
  `EditableRichText`'s wiring effect
  (`src/components/RichText/EditableRichText.tsx`) zips
  `container.children` against `renderedData.root.children` **by raw array
  index** - `Array.from(container.children).forEach((child, index) => {
  const originalNode = renderedData.root.children[index] ... })`. Without a
  guaranteed one-DOM-node-per-array-slot invariant, a `null`-rendering block
  anywhere in `body` shifts every subsequent DOM index out of alignment with
  the data array, so a later paragraph or heading can get wired up using a
  **different** node's original type/metadata. If that misattributed node
  happens to also be an editable type, typing into what looks like one
  paragraph splices the edit into a different paragraph's slot in
  `root.children` on Save - silent cross-contamination, not just a missed
  click target. The wrapper closes this by making every top-level `block`
  node contribute exactly one DOM child unconditionally, restoring positional
  parity; `display: contents` (via the `contents` Tailwind utility, per this
  project's no-inline-styles rule) keeps that wrapper invisible to layout.
- Why `EditableFieldProvider value={false}` must also wrap each embedded
  block, separately from the positional fix: `Hero`/`FeatureGrid`/etc. call
  `useEditableField({ blockId: id, fieldPath: '...', ... })` for their own
  fields, and `useIsEditableField()` is a single page-wide boolean context.
  Once `PostClient.tsx` turns that context on for `body`'s own editing, an
  embedded block's fields would inherit it too and start dispatching
  `block-text-edit` with the embedded block's own `id` as `blockId` - but
  that id was never rendered as a top-level `blocks`-array admin row (it
  lives inside a Lexical field's internal state instead), so
  `resolveFieldTarget` in `block-field-sync/Component.tsx` finds no matching
  row and no matching top-level field name, and silently drops the message
  (its own documented behavior for an unresolvable id). The visible result
  without this guard: an embedded Hero's heading looks click-to-edit and
  accepts keystrokes, but the edit is dropped and reverts on the next
  refresh/Save - a broken, unannounced UX regression, exactly what the build
  plan's "stay non-editable" exclusion for 30b is there to prevent. Resetting
  the context to `false` for the embedded block's subtree makes
  `useEditableField`/`useIsEditableField` report not-editable there, so
  those fields render exactly as they do on a Page today: visible, inert.
- `blockFieldSync` (not `blockHoverSync`) is the right precedent to copy:
  Header/Footer/Settings mount only `blockFieldSync` because none of them has
  a top-level `blocks`-array field with hoverable admin rows either - Post's
  `body` is the same shape (a single field, not a row-based array) even
  though its content happens to come from a Lexical document instead of a
  group of plain fields.
