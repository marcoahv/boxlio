# Current Feature

**Title:** Extend inline text editing to Header/Footer/Settings
**Type:** Feature
**Status:** verified
**Branch:** `feature/extend-inline-text-editing-to-header-footer-settings`

## Goal

Build plan item 29b. Extend feature 29a's click-to-edit-in-the-live-preview-iframe
behavior (`useEditableField`, the `block-text-edit`/`block-field-focus`/
`block-field-blur` bridge, `BlockFieldSync`) from Pages' `blocks`/`blogBlocks` to
the three Header/Footer/Settings text fields the build plan names: Header's
`navLinks[].label` and `ctaButtons[].label`, Footer's `navLinks[].label`, and
Settings' `siteName` (rendered only inside Footer's copyright line). A field is
editable in the preview only while its *owning* document is the one open in
Payload's Live Preview panel - a borrowed cross-document field rendered in
place (Footer's copy of `Settings.siteName`) stays read-only there and only
becomes editable when Settings itself is open.

During spec review, reading the actual render code
([HeaderClient.tsx:172-184](src/globals/Header/Component/HeaderClient.tsx#L172-L184),
[HeaderClient.tsx:227-244](src/globals/Header/Component/HeaderClient.tsx#L227-L244),
[FooterClient.tsx:55-63](src/globals/Footer/Component/FooterClient.tsx#L55-L63))
surfaced that every nav-link and CTA-button label renders inside a real
`<Link href>` anchor - the exact "clicking navigates the iframe instead of
editing" conflict feature 29a's own spec explicitly deferred for
`Header.ctaButtons` ("Resolving that conflict... is a follow-up, not part of
29a"). The user resolved this during review: suppress the link's default
navigation (`e.preventDefault()`) while that link's own document is the one
open in Live Preview, added generically to `useEditableField`'s `onClick`, so
the exact rendered `<Link>` becomes the editable element with no extra UI
chrome. Outside that exact state, links navigate exactly as they do today.

## In scope

- Generalizing the row-id convention `src/utilities/blockRowLookup.ts` already
  uses (`ROW_SELECTOR`, `ROW_ID_PATTERN`) from hardcoded `blocks`/`blogBlocks`
  to any repeatable array field's row id, so Header's `navLinks-row-N`/
  `ctaButtons-row-N` and Footer's `navLinks-row-N` resolve the same way Pages'
  block rows already do. This is Payload's own row-id convention
  (`${parentPath}-row-${index}`), not something specific to the `blocks` field
  type.
- A top-level-field fallback in `BlockFieldSync`
  (`src/custom/block-field-sync/Component.tsx`): when an incoming `blockId`
  resolves to no array row (via `findRowElementForBlockId`), and
  `getField(fieldPath)` shows that path exists directly on the current
  document's own form, dispatch/expand against `fieldPath` itself with no row
  prefix, instead of silently dropping the message. This is what lets
  Settings' `siteName` (a plain top-level field, no array wrapper) reuse the
  exact same listener with no new message type and no new component.
- Extending `expandTowardField`'s tab-search fallback (`tryNextTab`) to search
  the whole document, not just the resolved block's own row element, when
  there is no row - so focusing Settings' `siteName` in the preview can switch
  the sidebar into its "Information" tab the same way focusing a field inside
  one of a block's own internal tabs already switches tabs today.
- A generic `onClick` handler added to `useEditableField`'s `fieldProps` that
  calls `e.preventDefault()` whenever `isEditable` is true - a no-op on a
  non-interactive element (every existing Pages/Posts block field), and what
  stops a `<Link>`'s navigation once spread onto it.
- Wiring `useIsLivePreviewActive({ type: 'global', globalSlug })` +
  `EditableFieldProvider` + `useEditableField` into:
  - **Header** (`HeaderClient.tsx`) - `navLinks[].label` and
    `ctaButtons[].label`, gated on `globalSlug: 'header'`. `fieldProps` spreads
    directly onto the existing `<Link>` for each item; its children become
    the hook's frozen `content` instead of the live `label` prop.
  - **Footer** (`FooterClient.tsx`) - `navLinks[].label`, gated on
    `globalSlug: 'footer'` (its own, independent `EditableFieldProvider`).
  - **Footer's borrowed `siteName`** - the `{siteName}` interpolation inside
    `footer__copyright`, gated on a *second*, independent
    `useIsLivePreviewActive({ type: 'global', globalSlug: 'settings' })` call
    and its own `EditableFieldProvider` subtree, scoped to only that text -
    never the same flag or provider as Footer's own `navLinks`.
- Mounting `BlockFieldSync` as a top-level `ui` field in `Header`'s and
  `Footer`'s configs (flat field arrays, same pattern as Pages), and in
  `Settings`' config as a sibling to its single top-level `tabs` field -
  **not** nested inside any individual tab, since Payload's `TabsField` only
  renders the active tab's fields and nesting it inside "Information" would
  unmount the listener the moment the editor switched to "Corners"/"Shadows"/
  etc.
- `blockId` convention for the new call sites: the array row's own Payload-
  assigned `id` for `navLinks[].label`/`ctaButtons[].label` (identical to a
  Pages block); any truthy non-row-matching string (e.g. the field's own
  name) for Settings' `siteName`, since the new top-level fallback is what
  makes that meaningful, not the string's content.

## Out of scope

- Header's `socialLinks` (`platform` select, `url`, `icon`) - no plain-text
  label field in the build plan's list.
- Every other Settings field (`siteDescription`, `gtmCode`, icons, and every
  Corners/Shadows/Colors/Typography/Whitespace control) - these either render
  no visible text at all or are established (feature 20) as head-only/style-
  token fields that intentionally stay non-reactive during live preview. Only
  `siteName` is named in the build plan.
- Header's `logo`/`logoDark` borrowed by Footer - stays a one-time,
  non-reactive snapshot (feature 17's existing rule); not a text field and not
  named in the build plan.
- Reordering, adding, or deleting array rows (`navLinks`, `ctaButtons`) from
  the iframe - only editing an existing row's `label` text.
- Lexical rich text, Posts, and Pages/blogBlocks - unchanged, feature 29a's
  existing scope and exclusions stand as-is.
- Any new server-side API route, endpoint, or access-control change. Editing
  still ends at each global's existing sidebar Save button and its existing
  `update` access check (`Boolean(req.user)`, unchanged in `Header`/`Footer`/
  `Settings` configs).
- Modifier-click/new-tab handling nuances beyond basic `preventDefault()` -
  while a link is in edit mode (its own document open in Live Preview), all
  clicks on it are treated as "start editing," not "navigate, possibly in a
  new tab."

## Build loop

Per `blueprint/config.json`: `workflow.stepReview` is `"feature"` and
`checkpointCommits` is `"disabled"`. Implement all steps below without pausing
for per-step approval or creating per-step commits; stop once every step is
done and present one feature-level review packet (full diff + Done-when
evidence for each step). `/complete` creates the final commit.

## Build steps

- [x] 1. **Shared foundation - row-lookup generalization, top-level fallback,
  click suppression (no visible behavior change for Pages/Posts).**
  - In `src/utilities/blockRowLookup.ts`, generalize `ROW_SELECTOR` and
    `ROW_ID_PATTERN` from hardcoded `blocks|blogBlocks` to any field name
    matching Payload's `${fieldName}-row-${index}` id convention (e.g.
    `/^([A-Za-z]+)-row-(\d+)$/`), so `resolveBlockId`/`findRowElementForBlockId`/
    `parseRowId` work for `navLinks-row-N`/`ctaButtons-row-N` unchanged.
    `rowElementIdsAlongPath` already has no such hardcoding - leave it as is.
  - In `src/custom/block-field-sync/Component.tsx`, add the top-level
    fallback: when `findRowElementForBlockId(blockId, getField)` returns
    nothing, check `getField(fieldPath)`; if that field exists on the current
    document's form, use `fieldPath` itself as the full dispatch/expand path
    for `block-text-edit` and `block-field-focus` (skip the row-prefix
    computation entirely). `block-field-blur` needs no change - it never calls
    `findRowElementForBlockId`.
  - In the same file, widen `expandTowardField`'s `tryNextTab(rowEl, ...)`
    call to `tryNextTab(document.body, ...)` when there is no resolved
    `rowEl` (the top-level fallback case), so a top-level `Tabs` field can be
    switched into.
  - In `src/utilities/useEditableField.ts`, add `onClick: (e) =>
    e.preventDefault()` to the returned `fieldProps` (only present when
    `isEditable` is true, matching every other handler already there).
  **Done when:** `npm run test:int` passes, including new cases in
  `tests/int/blockRowLookup.int.spec.ts` proving the generalized pattern
  resolves a non-`blocks`/`blogBlocks` field name (e.g. `navLinks-row-2`) the
  same way; existing Pages/Posts click-to-edit behavior (e.g. Hero's heading)
  still works identically by hand-check in the browser - no regression from
  the generalized regex or the new fallback branch; `npm run lint` and
  `npm run build` clean.

- [x] 2. **Header: `navLinks[].label` and `ctaButtons[].label`.** Add a
  `headerFieldSync` `ui` field (`Field:
  '@/custom/block-field-sync/Component.tsx#BlockFieldSync'`) to
  `src/globals/Header/config.ts`'s top-level `fields`. In `HeaderClient.tsx`,
  add `const isEditable = useIsLivePreviewActive({ type: 'global', globalSlug:
  'header' })`, wrap the `<ul className="header__links">` and
  `<ul className="header__actions">` lists in an `EditableFieldProvider`
  keyed to `isEditable`, and call `useEditableField` per item
  (`fieldPath: `navLinks.${index}.label`` / `` ctaButtons.${index}.label` ``,
  `blockId: item.id`, `multiline: false`), spreading the returned
  `fieldProps` onto each item's existing `<Link>` and rendering `content`
  instead of `item.label`. Run `npm run payload -- generate:importmap` if the
  admin panel doesn't already resolve the new field's component.
  **Done when:** with Header's own Live Preview open, clicking a nav-link
  label or a CTA button label in the iframe edits it in place (no
  navigation), typing updates the matching sidebar field live and marks it
  unsaved, and Save persists it; with a different document open in Live
  Preview (e.g. a Page), the same labels render as plain, non-editable,
  normally-navigating links - verified by hand in the browser.

- [x] 3. **Footer: `navLinks[].label`.** Add a `footerFieldSync` `ui` field to
  `src/globals/Footer/config.ts`'s top-level `fields`. In `FooterClient.tsx`,
  add `const isFooterEditable = useIsLivePreviewActive({ type: 'global',
  globalSlug: 'footer' })`, wrap `<ul className="footer__links">` in its own
  `EditableFieldProvider`, and wire `useEditableField` for
  `navLinks.${index}.label` the same way step 2 does, spreading onto each
  item's `<Link>`.
  **Done when:** same verification as step 2, for Footer's own nav-link
  labels, with Footer's Live Preview open.

- [x] 4. **Settings: `siteName` via Footer's borrowed copyright line.** Add a
  `settingsFieldSync` `ui` field to `src/globals/Settings/config.ts`'s
  top-level `fields`, as a sibling to the existing `{ type: 'tabs', ... }`
  entry (not nested inside the "Information" tab). In `FooterClient.tsx`, add
  a second, independent `const isSettingsEditable = useIsLivePreviewActive({
  type: 'global', globalSlug: 'settings' })` and wrap only the `{siteName}`
  interpolation inside `footer__copyright` in its own `EditableFieldProvider`
  keyed to `isSettingsEditable` (distinct from step 3's Footer provider). Call
  `useEditableField({ blockId: 'siteName', fieldPath: 'siteName', value:
  siteName, multiline: false })` and spread `fieldProps` onto the element
  wrapping the site name text, rendering `content` in place of the live
  `siteName` value.
  **Done when:** with Settings' own Live Preview open (any page rendering
  Footer), the copyright line's site name becomes click-to-edit and syncs to
  Settings' own sidebar `siteName` field; with Footer itself open instead
  (not Settings), that same text stays plain and non-editable - verified by
  hand in the browser.

## Files / areas

- `src/utilities/blockRowLookup.ts` - generalize `ROW_SELECTOR`/
  `ROW_ID_PATTERN` to any field name
- `src/custom/block-field-sync/Component.tsx` - top-level fallback for
  `block-text-edit`/`block-field-focus`, document-wide tab search fallback
- `src/utilities/useEditableField.ts` - add `onClick` preventDefault to
  `fieldProps`
- `src/globals/Header/config.ts` - mount `BlockFieldSync` as a top-level `ui`
  field
- `src/globals/Header/Component/HeaderClient.tsx` - gating + provider +
  `useEditableField` for `navLinks[].label`/`ctaButtons[].label`
- `src/globals/Footer/config.ts` - mount `BlockFieldSync` as a top-level `ui`
  field
- `src/globals/Footer/Component/FooterClient.tsx` - two independent gating
  flags/providers: Footer's own `navLinks`, and the borrowed Settings
  `siteName`
- `src/globals/Settings/config.ts` - mount `BlockFieldSync` as a sibling to
  the top-level `tabs` field
- `tests/int/blockRowLookup.int.spec.ts` - extend with a non-`blocks` field-
  name case

## Data / contracts

- **Message contract: reused unchanged.** `block-text-edit`/
  `block-field-focus`/`block-field-blur` in `BlockSyncMessage`
  (`src/utilities/blockSyncMessages.ts`) and `isBlockSyncEvent`'s validation
  are not modified - no new message type, no schema change.
- **`blockId` semantics, generalized:** for a field nested in a repeatable
  array row (Header `navLinks`/`ctaButtons`, Footer `navLinks`), `blockId` is
  that row's own stable Payload-assigned `id` - identical to a Pages/Posts
  block. For a field with no array wrapper (Settings' `siteName`), `blockId`
  is any truthy string that will not resolve to a real row (e.g. the field's
  own name); step 1's top-level fallback is what makes that meaningful, not
  the literal value chosen.
- **Row-lookup generalization:** Payload renders every repeatable array row's
  wrapper with the same deterministic `${fieldName}-row-${index}` id
  regardless of field type (`blocks`, `blogBlocks`, or a plain `array` like
  `navLinks`/`ctaButtons`) - confirmed by reading `blockRowLookup.ts`'s own
  sourcing comment. Widening the regex/selector is a safe generalization, not
  a new assumption.
- **Top-level fallback (new):** in `BlockFieldSync`, when
  `findRowElementForBlockId` finds no row for an incoming `blockId`, and
  `getField(fieldPath)` confirms that path exists on the current document's
  own form, dispatch/expand directly against `fieldPath` with no row prefix.
  An unresolvable `blockId`/`fieldPath` pair (neither a real row nor a real
  top-level field) stays a silent no-op, matching every other unmatched-id
  case this bridge already has.
- **Tab-search fallback (new):** `expandTowardField`'s `tryNextTab` is scoped
  to `document.body` instead of a block's own row element when there is no
  resolved row, so a top-level `Tabs` field (Settings) can be switched into
  the same way a block's own internal tab already can be.
- **Click suppression (new):** `useEditableField`'s `fieldProps.onClick` calls
  `e.preventDefault()` whenever `isEditable` is true, regardless of element
  type. It must be spread directly onto the actual `<Link>`/anchor that
  currently owns the label's navigate-on-click behavior (not a wrapping
  `<span>`), so the same click event is the one suppressed. Outside edit mode
  the link's navigation is completely unaffected - the handler doesn't exist
  in `fieldProps` at all when `isEditable` is false.
- **Per-document gating, applied per field, not per component:** Footer
  renders text owned by two different documents (its own `navLinks`, and
  Settings' borrowed `siteName`) side by side. Each gets its own
  `useIsLivePreviewActive({ type: 'global', globalSlug })` call and its own
  `EditableFieldProvider` subtree - never share one flag/provider across
  fields with different owning documents, per the build plan's borrowed-field
  rule.
- **Persistence/security: unchanged from 29a.** No new Local API call, hook,
  or endpoint. Save still goes through each global's existing sidebar Save
  button and its existing `update` access check (`Boolean(req.user)`) already
  defined in `src/globals/Header/config.ts`/`Footer/config.ts`/
  `Settings/config.ts`.

## Testing

- Extend `tests/int/blockRowLookup.int.spec.ts` (Vitest, pure logic) with a
  case proving the generalized `ROW_ID_PATTERN`-based resolution works for a
  non-`blocks`/`blogBlocks` field name (e.g. a `navLinks-row-2` row id),
  mirroring the file's existing `blocks`/`blogBlocks` cases.
  `blockSyncMessages.int.spec.ts` needs no new cases - the message shapes are
  unchanged; confirm the existing suite still passes.
- Per `coding-standards.md`, the admin-side listener's new fallback branch,
  the tab-search widening, and the click-suppression handler are DOM/UI-
  integration logic, not unit-tested - verify each build step by hand in the
  browser (Live Preview open, click, type, Save), matching every Done-when
  above. This follows feature 29a's own established precedent: no
  admin-authenticated Playwright fixture exists in this repo yet, and
  standing one up remains a separable follow-up, not part of this feature.
- `npm run test:int`, `npm run lint`, and `npm run build` remain the available
  automated evidence; no combined `Verify` command exists yet.

## Notes for the AI

- Everything touched in step 1 is shared with Pages/Posts block editing
  (feature 29a) - the point of generalizing rather than forking is that
  Header/Footer/Settings and Pages/Posts end up on the exact same bridge.
  Re-verify Hero's heading/subheading click-to-edit still works after step 1;
  a regression there means the generalized regex or the new fallback branch
  is too broad.
- The click-suppression resolution came out of spec review, not out of the
  build plan's own wording - verify in the browser that `preventDefault()`
  actually stops Next.js's `<Link>` client-side navigation, not just the bare
  `<a>`'s default browser navigation, since `Link` layers its own click
  interception on top of the native anchor. If `preventDefault()` alone
  proves insufficient once tested by hand, that's an implementation detail to
  resolve in this step (e.g. also `stopPropagation()`), not a reason to
  reopen the design decision.
- Settings' `siteName` has no array row at all - don't invent a synthetic
  row/id for it. Any truthy `blockId` string works, because the top-level
  fallback activates on "no row matched," not on what the string contains.
- All four fields in scope (`navLinks[].label`, `ctaButtons[].label`,
  `siteName`) are plain Payload `text` fields, never `textarea` - every
  `useEditableField` call in this feature passes `multiline: false`.
- Footer's `siteName` rendering is a borrowed field: the DOM node lives in
  `FooterClient.tsx`, but the *owning* document for gating purposes is
  `settings`, not `footer`. Don't reuse Footer's own `isFooterEditable` flag
  for it, and don't let one `EditableFieldProvider` cover both.
- Confirm each newly-registered `ui` field's component actually resolves in
  the admin panel before relying on it; re-run
  `npm run payload -- generate:importmap` if it doesn't (the path/export
  itself already exists in the import map from feature 29a's Pages
  registration, so a fresh entry may not be required, but verify rather than
  assume).

## Implementation notes

`useIsLivePreviewActive` needs a moment after Live Preview first opens for the
initial handshake to land - a click before that arrives is a silent no-op, not
a defect. Confirmed live during this feature's own review: a first click
right as Live Preview opened appeared broken (on Pages *and* Header/Footer
alike), but retesting a beat later worked correctly every time. Documented in
the hook's own doc comment so this doesn't get mistaken for a regression
again.
