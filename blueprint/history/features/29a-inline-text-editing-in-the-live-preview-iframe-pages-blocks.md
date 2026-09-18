# Current Feature

**Title:** Inline text editing in the live preview iframe (Pages blocks)
**Type:** Feature
**Status:** verified
**Branch:** `feature/inline-text-editing-in-the-live-preview-iframe-pages-blocks`

## Goal

Build plan item 29a. Let an editor click a plain text element rendered inside
a Page's `blocks`/`blogBlocks` in the live preview iframe and type directly in
place, with the edit flowing back into the matching admin sidebar field live
(as you type), so the existing unsaved-changes/Save flow picks it up
unchanged. This adds a second, reverse (iframe -> admin) `postMessage` channel
alongside feature 28's existing admin -> iframe hover/select bridge, on the
same `data-block-id` marker.

## In scope

- A generic `data-editable-field="<relative-path>"` marker + a shared React
  hook that makes a rendered text/paragraph element `contentEditable` when
  (and only when) the page is genuinely open inside Payload's Live Preview
  panel for the document being edited (see Data/contracts - the gating rule).
  Outside that exact condition (a normal visitor, or any other embedding),
  the element renders exactly as it does today - no attribute, no editable
  behavior, no visual change.
- Wiring that hook into every current plain text/textarea field on Pages'
  registered blocks and the one blog-only block that has one:
  - **Hero** (`hero`) - `heading`, `subheading`
  - **FeatureGrid** (`featureGrid`) - `heading`, `intro`, each row's
    `features.<i>.title` / `features.<i>.body`
  - **CallToAction** (`callToAction`) - `heading`, `body`
  - **Table** (`table`) - `heading` (its `rows[].cells[].content` is rich
    text - out of scope, see below)
  - **BlogListing** (`blogListing`, blog-only) - `heading`
- The reverse `postMessage` channel: a new `block-text-edit` message
  (`{ type: 'block-text-edit', blockId, fieldPath, value }`) added to the
  existing `BlockSyncMessage` union in `src/utilities/blockSyncMessages.ts`,
  posted from the previewed page to the admin parent window.
- A new admin-side listener, mounted the same way feature 28's
  `BlockHoverSync` is (a top-level `ui` field in `Pages.blocks`'s Content
  tab, so it's live regardless of which rows are collapsed), that resolves
  the incoming `blockId` to that block's *current* row index and writes the
  value into Payload's own form state via `dispatchFields({ type: 'UPDATE',
  path, value })` + `setModified(true)` - the same public `useForm()` API
  the codebase already uses for this class of operation, not a private or
  invented mechanism.
- Extracting the row-lookup logic `BlockHoverSync` already has (`ROW_SELECTOR`,
  `ROW_ID_PATTERN`, resolving a row element <-> its block id) into one shared
  utility, so both the existing hover sync and the new listener use the same
  source of truth instead of duplicating the regex/selector.
- A visual affordance (hover/focus cue) on an editable field, distinct from
  feature 28's whole-block highlight, so an editor can tell a given piece of
  text is click-to-edit.
- Paste and multi-line safety: typed/pasted content is read and written as
  plain text only (`element.textContent`, and a `paste` handler that inserts
  `clipboardData.getData('text/plain')` rather than rich clipboard HTML) -
  these are plain Payload `text`/`textarea` fields, never rich text, so no
  formatting can ever enter them from the iframe side. Fields backed by a
  `textarea` (`subheading`, `intro`, `body`, feature `body`) preserve an
  explicit line break the same way the sidebar's own `textarea` does.
- **Editor jump-to-field** (added after initial verification, at the user's
  request): the moment an editable element gains focus in the iframe (not on
  every keystroke - once per focus), the admin panel expands that block's
  "Edit" accordion if it's collapsed and scrolls its own sidebar to the
  matching field, so the editor doesn't have to hunt for which sidebar
  control they just started typing into. Never moves keyboard focus to the
  sidebar field - see Notes for the AI for why that's a hard constraint, not
  a preference.

## Out of scope

- **Link/button labels** (`links[].label`, `Hero`/`CallToAction`'s "Buttons"
  arrays; also present on `Header.ctaButtons`, out of scope entirely here).
  These render as real `<a href>` elements. Payload's Live Preview iframe is
  the actual rendered site - clicking a link inside it navigates the iframe,
  which editors already rely on to click through the previewed site. Making
  that same click enter edit mode instead would silently break navigation
  for every other link on the page. Resolving that conflict (e.g. a separate
  small edit affordance next to the label, rather than click-on-the-anchor)
  is a follow-up, not part of 29a.
- **Lexical rich text** - `RichTextBlock`'s `content`, `Table`'s
  `rows[].cells[].content`, and Post's `body` (Posts are entirely out of
  scope, see below). Needs its own contentEditable/Lexical-sync design;
  explicitly excluded by build plan item 29.
- **Posts** - their blocks are Lexical-embedded and don't render the
  `data-block-id` marker at all (feature 28's own exclusion; unchanged here).
- **Header/Footer/Settings** text fields - build plan item 29b, a separate
  feature.
- Any new server-side API route, endpoint, or access-control change. This
  feature only changes what already-authenticated Payload admin client code
  does with form state it already fully controls in the visitor's own
  browser tab; persistence still goes through the existing signed-in
  `Pages.update` access check (`Boolean(req.user)`, unchanged) when the
  editor presses the existing block "Edit" accordion Save button.
- Reordering, adding, or deleting blocks/rows from the iframe. Only editing
  an existing field's text value.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `"feature"` and
`checkpointCommits` is `"disabled"`. Implement all steps below without
pausing for per-step approval or creating per-step commits; stop once every
step is done and present one feature-level review packet (full diff +
Done-when evidence for each step). `/complete` creates the final commit.

## Build steps

- [x] 1. **Reverse message contract + shared row lookup (no visible
  behavior change yet).** Add `block-text-edit` to the `BlockSyncMessage`
  union and `BLOCK_SYNC_MESSAGE_TYPES` in
  `src/utilities/blockSyncMessages.ts`. Extract `ROW_SELECTOR`,
  `ROW_ID_PATTERN`, and the row-element <-> block-id resolution
  `src/custom/block-hover-sync/Component.tsx` already has into a shared
  `src/utilities/blockRowLookup.ts` (both directions: row element -> block
  id, and block id -> its current row element), and have
  `block-hover-sync/Component.tsx` import it instead of its own inline
  copy. Add a new `src/utilities/postFromPreviewToAdmin.ts` mirroring
  `postToLivePreviewIframe.ts` in reverse (`window.parent.postMessage(message,
  getServerSideURL())`).
  **Done when:** `npm run test:int` passes, including new cases in
  `tests/int/blockSyncMessages.int.spec.ts` for the `block-text-edit`
  message shape (accepted from the configured origin, rejected from
  another); `block-hover-sync` still behaves identically (no functional
  change, only where its constants/function live).

- [x] 2. **Reference implementation: Hero.** Build the shared hook (e.g.
  `useEditableField`) that: reads the "is this document's Live Preview
  genuinely open" flag (see Data/contracts), and when true, makes its
  target element `contentEditable`, syncs `textContent` on `input`,
  restricts `paste` to plain text, and posts a debounce-free
  `block-text-edit` message per input event carrying the block's id and the
  field's relative path. Apply it to Hero's `heading` and `subheading` in
  `src/blocks/Hero/Component.tsx`, adding `data-editable-field="heading"` /
  `"subheading"`. Add the admin-side listener,
  `src/custom/block-text-edit-sync/Component.tsx` (`BlockTextEditSync`),
  registered as a second top-level `ui` field next to `blockHoverSync` in
  `src/collections/Pages/config.ts`'s Content tab; it resolves the incoming
  `blockId` to its current row via the shared lookup, computes
  `${fieldName}.${rowIndex}.${fieldPath}` (`fieldName` is `blocks` here),
  and calls `dispatchFields({ type: 'UPDATE', path, value })` +
  `setModified(true)`. Run `npm run payload -- generate:importmap` after
  adding the new admin component path.
  **Done when:** in the Pages admin editor, with a Page's Live Preview open,
  clicking Hero's heading or subheading in the preview lets you type, and
  the matching sidebar field (inside that block's "Edit" accordion) updates
  live and shows as an unsaved change - verified by hand in the browser
  (screenshot/manual, per project convention for UI/integration behavior).

- [x] 3. **Roll out to the remaining fields.** Apply the same hook +
  `data-editable-field` marker to: `FeatureGrid` (`heading`, `intro`, each
  `features.<i>.title` / `features.<i>.body`), `CallToAction` (`heading`,
  `body`), `Table` (`heading` only), and blog-only `BlogListing`'s `heading`
  (`src/collections/Pages/blogBlocks/BlogListing/Component.tsx`) - this last
  one resolves through `fieldName: 'blogBlocks'` instead of `'blocks'`.
  **Done when:** each listed field is click-to-edit in the preview and
  syncs to its sidebar field, verified by hand for at least one field per
  block type.

- [x] 4. **Affordance + paste/newline hardening.** Add a hover/focus visual
  cue for an editable field (e.g. a dashed outline / `cursor: text`,
  distinct from feature 28's `block-sync-highlight`), confirm pasting
  formatted text (e.g. from a rich text editor or a webpage) into an
  editable field yields plain unformatted text, and confirm a `textarea`-
  backed field (e.g. Hero's `subheading`) keeps an explicit line break
  after the block is saved and the page reloaded.
  **Done when:** all three behaviors are verified by hand in the browser.

- [x] 5. **Editor jump-to-field.** Add `onFocus`/`onBlur` to
  `useEditableField`'s returned `fieldProps`, posting `{ type:
  'block-field-focus', blockId, fieldPath }` / `{ type: 'block-field-blur',
  blockId, fieldPath }` (both added to `BlockSyncMessage`), once per
  focus/blur, not per keystroke. Rename `src/custom/block-text-edit-sync/`
  to `src/custom/block-field-sync/` (component `BlockFieldSync`) - its job
  now covers all three messages, not just text edits - update the
  registered path in `src/collections/Pages/config.ts` (field name
  `blockFieldSync`) and re-run `npm run payload -- generate:importmap`.

  `BlockFieldSync` resolves the row exactly as `block-text-edit` already
  does to get `fullPath`, then locates the target field element by
  `document.getElementById('field-' + fullPath.replace(/\./g, '__'))`
  (Payload's own field-id convention). From there, `findAncestorCollapsibles`
  walks up through *every* ancestor with class `.collapsible` - not just
  one "the Edit accordion" - since our own "Edit" accordion, an array
  field's own per-row collapse (e.g. one of FeatureGrid's `features`), and
  Payload's native per-block-row collapse are all built on the same
  `Collapsible` primitive and can stack at any depth (see Data/contracts).
  On `block-field-focus`, `reconcileExpanded` diffs that ancestor chain
  against whatever this component currently has auto-expanded
  (`ownedRef`): collapses anything no longer needed, expands anything still
  collapsed (a real `.click()` on each `.collapsible__toggle` - there is no
  public API for this), and keeps ownership of anything shared with the
  previous field (so moving between two fields under the same accordion
  never flickers it closed-then-open). `scrollIntoView({ behavior:
  'smooth', block: 'center' })` plus a brief highlight follow, after the
  ~400ms open animation only when something actually had to expand. Never
  calls `.focus()` on the field (Notes for the AI).

  On `block-field-blur`, after `BLUR_GRACE_MS` (150ms) - so a blur
  immediately followed by a focus on a related field doesn't flicker -
  collapses everything currently in `ownedRef` and clears it, unless a
  newer focus has already superseded this blur.
  **Done when:** with a Page's Live Preview open and a block's "Edit"
  accordion collapsed, clicking into that block's heading text in the
  iframe expands it and scrolls the sidebar to the heading field, without
  moving keyboard focus out of the iframe (confirmed by typing immediately
  after the click and seeing it land in the iframe, not the sidebar);
  clicking a FeatureGrid item's title (nested inside both the array row's
  own collapse and the block's "Edit" accordion) expands both levels;
  tabbing/clicking to a sibling field under the same already-open
  accordion(s) causes no flicker; clicking away entirely (or into a
  different block) collapses whatever was auto-opened after a brief pause;
  an accordion the editor had opened by hand themselves is never
  auto-collapsed - all verified by hand in the browser. `npm run test:int`
  still passes, including new cases in
  `tests/int/blockSyncMessages.int.spec.ts` for `block-field-focus` and
  `block-field-blur`.

## Files / areas

- `src/utilities/blockSyncMessages.ts` - extend the message union
- `src/utilities/blockRowLookup.ts` - new, extracted shared utility
- `src/utilities/postFromPreviewToAdmin.ts` - new, reverse poster
- `src/custom/block-hover-sync/Component.tsx` - import the extracted utility
- `src/custom/block-field-sync/Component.tsx` + `styles.css` - admin-side
  listener for `block-text-edit`, `block-field-focus`, and `block-field-blur`
  (renamed from `block-text-edit-sync` in step 5, once its job grew beyond
  text edits)
- `src/collections/Pages/config.ts` - register the `ui` field(s)
- `src/blocks/Hero/Component.tsx`, `FeatureGrid/Component.tsx`,
  `CallToAction/Component.tsx`, `Table/Component.tsx` - add the hook +
  marker to in-scope text fields
- `src/collections/Pages/blogBlocks/BlogListing/Component.tsx` - same, for
  `heading`
- New shared hook (e.g. `src/utilities/useEditableField.ts`)
- `tests/int/blockSyncMessages.int.spec.ts` - extend with the new message
  shape

## Data / contracts

- **Message shape:** `{ type: 'block-text-edit'; blockId: string; fieldPath:
  string; value: string }`, added to `BlockSyncMessage`. `fieldPath` is
  relative to the block (e.g. `'heading'`, `'features.0.title'`), never a
  full form path - the listener combines it with the block's *current* row
  index (blocks can be reordered; the id is stable, the index isn't).
- **Gating rule (must-have):** the editable behavior (the `contentEditable`
  attribute, the marker's interactive affordance, and posting any
  `block-text-edit` message) is only ever enabled once the page has received
  at least one genuine `payload-live-preview` message for the document being
  rendered - the same signal `useScopedLivePreview`'s `onMessage` already
  reacts to. Do not gate on an iframe-embedding heuristic
  (`window.self !== window.top`) alone; that doesn't distinguish "genuinely
  open in Payload's Live Preview" from "embedded in any other iframe" and
  would make text editable for a real visitor in that case. Before that
  first message arrives, and for a normal (non-embedded) visit, the element
  is inert and looks exactly as it does today.
- **Row resolution:** identical approach to `block-hover-sync`'s existing
  `resolveBlockId`, in reverse - scan `document.querySelectorAll(ROW_SELECTOR)`
  for the row whose resolved block id matches the incoming message's
  `blockId`, and read that row's `id` (`${fieldName}-row-${rowIndex}`) for
  the current index. A `blockId` with no matching row (block removed or not
  yet rendered) is a silent no-op, matching `useBlockSyncListener`'s existing
  failure mode for unmatched ids.
- **Write path:** `dispatchFields({ type: 'UPDATE', path, value })` followed
  by `setModified(true)`, both from `useForm()` - Payload's own public form
  API (`@payloadcms/ui`), the same class of call `addFieldRow`/`removeFieldRow`
  etc. already use internally. No new persistence path; Save still goes
  through the existing block "Edit" accordion Save button and the Pages
  collection's existing `update` access control.
- **Text safety:** values are read/written as plain text only
  (`element.textContent` on the DOM side); paste handlers insert
  `clipboardData.getData('text/plain')`, never `innerHTML` or rich
  clipboard formats. These fields are Payload `text`/`textarea` types and
  must never receive markup from this path.
- **Jump-to-field message shapes:** `{ type: 'block-field-focus'; blockId:
  string; fieldPath: string }` and `{ type: 'block-field-blur'; blockId:
  string; fieldPath: string }`, both added to `BlockSyncMessage`. Each fires
  once per focus/blur event, never per keystroke - `block-text-edit` already
  covers every keystroke and is unaffected.
- **Accordion open/close is generic, not block-specific (no public API):**
  Payload's `Collapsible` UI primitive exposes its open/close state via
  `useCollapsible()`, but that hook only works for a component rendered
  *inside* that specific collapsible's own subtree - unreachable from a
  top-level listener mounted as a sibling `ui` field. The only way to open
  *or* close one from outside is DOM: read `.collapsible--collapsed` on it,
  `.click()` its `.collapsible__toggle` button to flip it (a real DOM
  click, not a simulated dispatch - it runs through Payload's own
  `onClick={toggleCollapsible}` exactly as a user's click would). This is
  **not** specific to our own "Edit" accordion - Payload's Array field row
  (`fields/Array/ArrayRow.js`, e.g. one of FeatureGrid's `features`) and
  its own native per-block-row collapse (`fields/Blocks/BlockRow.js`) are
  built on the exact same `Collapsible` primitive and the same classes.
  `findAncestorCollapsibles` walks up from the target field through *every*
  ancestor with class `.collapsible`, at any nesting depth, rather than
  assuming there's exactly one (the "Edit" accordion) between the field and
  the block row - a field nested inside an array needs two or more expanded
  in sequence, not one.
- **Auto-expand ownership is per reconciliation, not per block:**
  `BlockFieldSync` tracks the exact set of ancestor collapsibles it
  currently has auto-expanded for the *currently focused* field (`ownedRef`,
  a plain array of elements) and reconciles it on every `block-field-focus`
  (`reconcileExpanded`): collapses anything owned that the new field's own
  ancestor chain no longer includes, expands whichever of the new chain is
  still collapsed, and carries forward ownership of any ancestor shared
  between the old and new field (e.g. the block's own "Edit" accordion when
  moving between two `features` rows in the same block - it stays open, not
  collapsed-then-reopened). An ancestor that was already open but never
  auto-expanded by this component - the editor opened it themselves, by
  hand, in the sidebar - is never added to `ownedRef` and so is never
  touched by a later `block-field-blur`.
- **Field element id convention:** every Payload field input's DOM `id` is
  `field-${path.replace(/\./g, '__')}` (confirmed in `@payloadcms/ui`'s
  own `fields/Text/Input.js` and `fields/Textarea/Input.js` - a Payload
  convention, not something this project defined). `fullPath` here is the
  exact same `${fieldName}.${rowIndex}.${fieldPath}` already computed for
  `block-text-edit`'s `dispatchFields` call.
- **Never focus the sidebar field.** The iframe's contentEditable element
  already holds real keyboard focus the moment this fires (`onFocus` is
  the trigger). Calling `.focus()` on the admin's field would shift the
  browser's single cross-frame focus target to the parent document,
  yanking focus out of the iframe and ending the very edit that triggered
  the jump. `scrollIntoView` only, plus a non-focus-stealing visual cue.

## Testing

- Extend `tests/int/blockSyncMessages.int.spec.ts` (Vitest, pure logic) with
  cases for the new `block-text-edit` message: accepted from the configured
  server origin, rejected from another origin, rejected with a missing
  `blockId`/`fieldPath`/`value` - mirroring the existing `block-hover`/
  `block-select` cases in that file. Step 5 adds the same shape of cases for
  `block-field-focus` and `block-field-blur` (each accepted with both
  required fields, rejected missing either one). The accordion open/close
  and blur-grace-period logic itself is DOM/timing-driven UI behavior, not
  unit-tested, matching every other DOM-manipulation piece in this feature.
- No new Playwright (`npm run test:e2e`) coverage in this feature. The only
  existing browser test (`tests/e2e/theme-toggle.spec.ts`) exercises the
  unauthenticated public frontend; there is no admin-login/seeded-session
  fixture in this repo yet, and this feature's actual behavior only shows up
  inside an authenticated Pages editor with its Live Preview panel open.
  Standing up authenticated Playwright fixtures is a separable concern that
  would make this slice disproportionate (per `coding-standards.md`'s
  "when it is proportionate" rule for declared Browser tests) - verify each
  step by hand in the browser instead, as each Done when says. Flag this to
  the user during `/check`/review if authenticated e2e coverage is wanted
  as explicit follow-up work.
- Per `coding-standards.md`, the DOM-manipulation-heavy pieces themselves
  (the `contentEditable` hook, the admin-side listener's row scan) are UI/
  integration surfaces, not unit-tested - same existing convention as
  `block-hover-sync`'s own untested DOM logic.
- No combined `Verify` command exists yet; use `npm run test:int`,
  `npm run lint`, and `npm run build` as this project's available evidence.

## Notes for the AI

- `contentEditable` + React: treat the element as effectively uncontrolled
  once mounted - set `suppressContentEditableWarning`, don't re-render its
  children from the `value` prop on every keystroke (only when an *external*
  update, e.g. another editor's live-preview merge, changes the value while
  it isn't focused), or the cursor will jump on every keystroke. This is the
  main technical risk in steps 2-3; get it right once in the shared hook
  rather than per block.
  - **Repair (post-implementation):** guarding the hook's own `el.innerText =
    value` write wasn't sufficient on its own - React's *own* children
    reconciliation is a second, independent writer. Every call site originally
    passed the live `value` prop as JSX children (`<Heading {...fieldProps}>
    {heading}</Heading>`), so once the debounced round trip echoed a keystroke
    back as a changed `heading` prop, React reconciled that text and reset the
    DOM node's content - which resets the browser's caret to the start even
    when the text written is identical to what's already there. Fixed by
    having `useEditableField` return a `content` value (frozen at mount via
    `useState`, never updated again) instead of exposing the live `value` for
    JSX children; every call site now renders `{fooField.content}`, not
    `{foo}`, when spreading `fooField.fieldProps`. React therefore never has a
    reason to touch that node's children again after mount, and the effect
    (now `useLayoutEffect`, to avoid a flash before the frozen content paints)
    remains the sole writer for every update after that.
- Reuse `getServerSideURL()` for both the existing admin -> iframe origin
  check and the new iframe -> admin one; frontend and admin are one Next.js
  app on one origin, same assumption `blockSyncMessages.ts` already makes.
- Don't duplicate `ROW_SELECTOR`/`ROW_ID_PATTERN`/row-id-parsing between
  `block-hover-sync` and the new listener - step 1 exists specifically to
  make that a shared import before step 2 needs it twice.
- Step 5's jump-to-field: never call `.focus()` on the sidebar field element
  - see Data/contracts. `scrollIntoView` is always safe here (admin is one
  document, no cross-frame scrolling risk like the frontend's own
  `scrollWithinThisWindow` had to guard against).
- If the block's own outer row (Payload's native block-row collapse,
  separate from our nested "Edit" accordion) isn't currently rendered with
  its fields mounted, the target field id won't exist yet - treat that as
  the same silent no-op every other unmatched-target case in this feature
  already uses. Don't build retry/polling machinery for it; it's an edge
  case, not the common path.
