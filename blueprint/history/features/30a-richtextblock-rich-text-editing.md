# Current Feature

**Branch:** feature/richtextblock-rich-text-editing
**Status:** verified

## Goal

Make a `RichTextBlock`'s rich text (`content`, a Lexical document) editable
directly inside the admin's Live Preview iframe: click into the rendered
prose, edit the wording, and use a small floating toolbar (Bold / Italic /
Link) to change formatting in place. Edits flow back into the sidebar's
Lexical field live, the same way plain text fields already do (29a-29d), and
persist through the existing Save flow unchanged.

This is build-plan item 30a, the first of two slices under parent item 30
("WYSIWYG rich text editing in the live preview iframe"). 30b (Post's `body`
field) is a separate, later spec.

## In scope

- `RichTextBlock.content` only (a page-builder block used on Pages and the
  blog listing page's `blogBlocks`).
- Editing the text of, and toggling Bold/Italic/Link on, `paragraph`,
  `heading` (h1-h6), and `quote` nodes rendered inside that field.
- A new structured reverse-bridge message, `block-rich-text-edit`, carrying a
  full replacement Lexical document (mirrors `block-text-edit`'s
  whole-field-value replacement, but object-valued instead of string-valued).
- Reading back every existing text-format mark on the DOM (bold, italic,
  underline, strikethrough, code, subscript, superscript) when converting an
  edited node, so editing nearby wording never silently strips a mark this
  toolbar doesn't expose. Only Bold, Italic, and Link can be *turned on* by
  the user in this slice.

## Out of scope

- Post's `body` rich text field - tracked separately as build-plan item 30b.
  (Its editor also has `BlocksFeature` enabled, embedding page-builder blocks
  inside the body; `RichTextBlock.content` uses the root default editor
  config in `src/payload.config.ts`, which has no `BlocksFeature`, so this
  slice never has to handle an embedded block inside the edited rich text.)
- Every mark besides Bold/Italic/Link: underline, strikethrough, inline code,
  subscript, superscript stay sidebar-only - not addable from the new
  toolbar.
- Any block-level structural change from the toolbar: turning a paragraph
  into a heading or vice versa, changing heading level, creating or editing
  lists, creating a blockquote, changing alignment/indent. All stay
  sidebar-only, same as today.
- `list`, `listitem`, `upload`, `relationship`, and `horizontalrule` nodes -
  never made `contentEditable` by this feature; they render exactly as they
  do today.
- Any change to how `content` is authored from the admin sidebar itself.
- Changing which fields report their own `data-block-id` marker, the
  admin -> iframe hover/select bridge (28), or any existing plain-text
  `useEditableField` caller (29a/29b/29c/29d) - all unchanged.
- A mirrored/fake cursor marker in the sidebar (tried and reverted - not part
  of this spec).

## Build loop

`workflow.stepReview` is `feature` and `workflow.checkpointCommits` is
`disabled` (`blueprint/config.json`): implement every build step below in one
pass without stopping for individual approval, then present a single review
packet covering all of them together. No intermediate commits between steps -
`/complete` creates the final commit after that review.

## Build steps

- [x] 1. **Structured message contract and the DOM<->Lexical node converter**
  - Add a `block-rich-text-edit` variant to `BlockSyncMessage`
    (`src/utilities/blockSyncMessages.ts`): `{ type: 'block-rich-text-edit',
    blockId: string, fieldPath: string, value: SerializedEditorState }`.
    Extend `isBlockSyncEvent` to validate it (string `blockId`/`fieldPath`,
    `value` a non-null object) and add cases to
    `tests/int/blockSyncMessages.int.spec.ts` covering a well-formed message
    and one missing each required field.
  - Add `src/utilities/richTextNodeSync.ts`, exporting a pure function that
    takes an edited DOM element plus the original `SerializedLexicalNode` it
    was rendered from, and returns a replacement node: the original's own
    `type`/`tag`/`format` (node-level, e.g. heading level or alignment)/
    `indent`/`direction`/`version` pass through untouched; only `children` is
    rebuilt from the current DOM text, split into `text` nodes whose format
    bitmask is read from `<strong>` (bold), `<em>` (italic), `<code>` (code),
    `<sub>`/`<sup>` (subscript/superscript), and `text-decoration:
    underline`/`line-through` on a wrapping element (underline/
    strikethrough) - matching exactly what
    `@payloadcms/richtext-lexical`'s own JSX text converter renders for each
    format bit, read in reverse. A run wrapped in `<a href>` becomes a `link`
    node around its text children; the `url` is accepted only when it starts
    with `http:`, `https:`, or `/` - anything else (e.g. `javascript:`) is
    dropped and that run is left unlinked. Only `paragraph`, `heading`, and
    `quote` original node types are converted; any other type is returned
    unchanged (defensive - callers only invoke this for in-scope nodes per
    the next step).
  - Add `tests/int/richTextNodeSync.int.spec.ts` covering: a plain text edit,
    adding bold, adding italic, overlapping bold+italic, adding a link,
    removing a link, rejecting a `javascript:` URL, and confirming the
    original node's own `type`/`tag`/`format`/`indent`/`direction`/`version`
    survive unchanged.
  - Extend `src/custom/block-field-sync/Component.tsx`'s `onMessage`: accept
    `block-rich-text-edit` alongside `block-text-edit` and dispatch the same
    `UPDATE` action with `event.data.value` (already a full document object,
    not a string - `dispatchFields` doesn't care which).
  - **Done when:** `npm run test:int` passes, including the new
    `blockSyncMessages` and `richTextNodeSync` cases.

- [x] 2. **Click-to-edit text for RichTextBlock's content (no toolbar yet)**
  - Add `src/components/RichText/EditableRichText.tsx` (client component).
    Outside Live Preview, or with no `blockId`, it renders exactly what
    `RichText` renders today - no behavior change. Inside Live Preview
    (`useIsEditableField()`), it renders through the same
    `RichTextConverter`/`jsxConverters` pipeline, then - via a ref and
    `useLayoutEffect`, the same imperative-takeover pattern
    `useEditableField` already uses (freeze initial content at mount, only
    apply external updates while not focused) - marks each top-level
    `paragraph`/`heading`/`quote` node in `content.root.children`
    `contentEditable`, keyed by its index in that array. `list`, `upload`,
    `relationship`, and `horizontalrule` top-level nodes are left alone
    entirely.
  - On `input`, run the edited node's DOM through `richTextNodeSync`, clone
    `content`, splice the rebuilt node back in at the same index, and call
    `postFromPreviewToAdmin({ type: 'block-rich-text-edit', blockId,
    fieldPath: 'content', value: clonedDocument })`. Paste behavior matches
    `useEditableField`'s existing plain-text fields: no rich paste in this
    step (plain text only) - rich paste-formatting support is not part of
    this slice.
  - Wire it into `src/blocks/RichTextBlock/Component.tsx` in place of the
    current `<RichText data={content} />` call, passing `blockId={id}`.
  - Widen the block's render guard exactly the way `useEditableField`'s own
    doc comment requires for an optional field: `content` can currently be
    cleared to empty and the block already returns `null` when falsy, but
    once this component owns the DOM node the user is actively typing into,
    unmounting it mid-edit (by returning `null` the instant the last
    character is deleted) must not happen while the field is focused/being
    edited - match the same widening pattern already used for optional
    block text fields elsewhere in this series.
  - **Done when:** with the dev server running, a Page's Live Preview
    containing a `RichTextBlock` lets you click into its rendered paragraph/
    heading/quote text, retype it, see the sidebar's `content` field update
    live, and the edit survives Save. Verified by manual run-through and
    screenshot at `/check` - no automated browser-test command is configured
    for this project.

- [x] 3. **Floating Bold / Italic / Link toolbar**
  - Extend `EditableRichText.tsx`: while the document selection is inside one
    of this block's editable regions and non-collapsed, show a small floating
    toolbar near the selection with Bold, Italic, and Link controls,
    reflecting the current selection's active marks. Toggling Bold/Italic
    changes the mark on the selected text immediately; the resulting DOM
    syncs through the same `richTextNodeSync` -> `block-rich-text-edit` path
    as any other edit. The toolbar hides when the selection collapses or
    moves outside an editable region.
  - Link shows an inline URL input (not a native browser `prompt()`) on
    confirm; wraps the current selection in a link once the URL passes the
    same `http:`/`https:`/`/` check `richTextNodeSync` enforces, otherwise
    shows an inline error and applies nothing. An existing link's control
    offers removing it the same way.
  - **Done when:** with the dev server running, selecting text inside an
    editable `RichTextBlock` paragraph in Live Preview shows the toolbar;
    toggling Bold/Italic changes the rendered mark and the change round-trips
    into the sidebar field and survives Save; adding a link via the toolbar
    produces a working link after Save, and an invalid URL is rejected with
    visible feedback and no link created. Verified by manual run-through and
    screenshot at `/check`.

## Files / areas

- `src/utilities/blockSyncMessages.ts` - new message variant + validation
- `tests/int/blockSyncMessages.int.spec.ts` - new cases
- `src/utilities/richTextNodeSync.ts` - new, pure DOM<->Lexical node converter
- `tests/int/richTextNodeSync.int.spec.ts` - new
- `src/custom/block-field-sync/Component.tsx` - accept the new message type
- `src/components/RichText/EditableRichText.tsx` - new client component
- `src/blocks/RichTextBlock/Component.tsx` - use the new component
- Reference only, unchanged: `src/components/RichText/index.tsx` and
  `converters/` (rendering pipeline this feature reuses), `src/payload.config.ts`
  (`RichTextBlock.content`'s editor config), `src/utilities/useEditableField.ts`
  and `EditableFieldContext.tsx` (the pattern this feature mirrors)

## Data / contracts

- `BlockSyncMessage` gains: `{ type: 'block-rich-text-edit', blockId: string,
  fieldPath: string, value: SerializedEditorState }`. Same trust boundary as
  every existing bridge message: same-origin `postMessage` only, no new
  network/API surface, and the value still only reaches Payload's stored data
  through the existing form Save -> Payload update path, unchanged. No new
  authorization surface.
- `richTextNodeSync`'s node-level fields (`type`, `tag`, `format`, `indent`,
  `direction`, `version`) always pass through from the original node
  untouched; only `children` is rebuilt from the DOM. Applies to `paragraph`,
  `heading`, and `quote` nodes only.
- Text-run format bits recognized on read: bold (`<strong>`), italic
  (`<em>`), code (`<code>`), subscript (`<sub>`), superscript (`<sup>`),
  underline/strikethrough (`text-decoration: underline`/`line-through` on a
  wrapping element) - matching `@payloadcms/richtext-lexical`'s own text
  converter output exactly, so a mark already present in saved content is
  preserved even though only Bold/Italic can be toggled on by this toolbar.
- Link `url` accepted only for `http:`, `https:`, or a leading `/` (relative)
  - any other scheme is dropped rather than stored.

## Testing

Vitest (`npm run test:int`, gate is on per `AGENTS.md`'s declared test
command): `richTextNodeSync` is pure conversion logic with real edge cases
(format combinations, link validation, node-metadata passthrough) - covered
per the build steps above. `blockSyncMessages`'s validation gets the same
well-formed/malformed coverage every existing message type already has.

`EditableRichText`'s contentEditable wiring and the floating toolbar are UI
behavior, not unit-tested per the project's testing scope rule - verified by
manual run-through and screenshot evidence during `/check` (no Browser tests
command is configured for this project).

## Notes for the AI

- Follow `useEditableField.ts`'s existing pattern for why `content` must be
  frozen at mount (a `useState` initializer, never updated after) rather than
  tracked live - the same React-contentEditable cursor-jump problem applies
  here, just per-node instead of per-field.
- `jsxConverters` (`src/components/RichText/converters/index.tsx`) already
  registers a `blocks` converter derived from the block registry, but
  `RichTextBlock.content` uses the root default editor
  (`lexicalEditor()` in `src/payload.config.ts`, no `BlocksFeature`), so no
  block node can ever appear inside it today - the per-node contentEditable
  wiring never needs to special-case an embedded block for this field.
- `resolveFieldTarget` in `block-field-sync/Component.tsx` already resolves
  `blockId` + `fieldPath: 'content'` to `${fieldName}.${rowIndex}.content`
  via the existing row-lookup path (RichTextBlock is a normal `blocks`-field
  row) - no change needed there beyond accepting the new message type.
- Do not build a generic Lexical-editor-in-an-iframe or adopt a rich text
  library for this. The scoped DOM-walk converter plus native
  `contentEditable`/selection APIs is the smallest mechanism that satisfies
  this slice's contract and stays consistent with the rest of this
  project's inline-editing series.
- `@payloadcms/richtext-lexical`'s field wrapper never renders
  `id="field-<path>"` (unlike every core field type, which gets it from
  `@payloadcms/ui`'s shared `generateFieldID`) - `block-field-sync`'s
  `findFieldElement` falls back to the resolved row's own
  `.rich-text-lexical` element so `block-field-focus` can still scroll to and
  highlight it.
- Payload's Lexical field intentionally excludes `value` from the memo that
  builds its editor's initial state (`Field.js`'s own comment: doing
  otherwise "will cause the entire lexical editor to re-render" on every
  save/live-preview tick) - it only visibly refreshes when `initialValue`
  changes. `block-field-sync/Component.tsx` relies on this: dispatching
  `block-rich-text-edit` sets both `value` and `initialValue` to force that
  refresh, unlike `block-text-edit`, which only needs `value` since a plain
  text `<input>` is a simple controlled element.
- A mirrored/fake cursor marker (both a `RichTextBlock`-specific Lexical
  version and a project-wide plain-field version) was built, then reverted at
  the user's request. Nothing about that attempt remains: no cursor-related
  message types, no `richTextCursor.ts`/`caretMirror.ts`, no
  `cursorMirrorFeature.*`, and `src/blocks/registry.ts` is back to a single
  file (the `componentRegistry.ts` split existed only to isolate that
  feature's server-only import from the client bundle). Re-attempting this is
  a new, separate decision - don't resurrect it from history as though it
  were still wanted.
