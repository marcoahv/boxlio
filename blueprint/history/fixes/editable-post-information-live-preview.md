# Current Feature

> **Generated file.** Holds the one feature, fix, or rollback being built right now. Run
> `/feature <number-or-name>` to spec a build-plan feature, or `/fix "<bug>"` for
> an ad-hoc fix. Use `/rollback <completed-feature>` to plan a safe reversal.
> Build one thing at a time; `/complete` archives it under
> `blueprint/history/` and resets this file.

## Title

Make Post Information-tab fields editable in Live Preview

**Type:** Fix
**Status:** verified
**Branch:** fix/editable-post-information-live-preview

## The problem

The Information tab (Pages/Posts config, flattened in commit `f6aa36b`) holds
`title`, `slug`, `summary`, `featured`, `author`, `category`, `date`,
`populatedAuthor`, `featuredImage`. None of it is click-to-edit in the Live
Preview iframe today, unlike page-builder blocks and the Post `body` field
(features 29a/30a/30b/32).

Scope check against what each collection actually renders on its own
frontend:

- **Pages**: `title`/`slug`/`featuredImage` render nowhere in the page body
  (`src/app/(frontend)/[slug]/PageClient.tsx` renders only `data.blocks`).
  There is no on-page element to make editable, so Pages are out of scope.
- **Posts**: `title` renders as plain text
  (`src/app/(frontend)/blog/[slug]/PostClient.tsx:44`), `summary` renders as
  plain text inside `PostPreview` (`src/components/PostPreview.tsx:74`, used
  with `variant="header"` from `PostClient`), and `author`/`category`/`date`
  (relationship/relationship/date fields) plus `featuredImage` (upload) also
  render there but aren't free text — they can't become `contentEditable`
  the way `title`/`summary` can.

## The fix

For the Post detail page only (`PostClient.tsx` + `PostPreview.tsx`,
`variant="header"` usage):

1. Make `title` and `summary` click-to-edit, reusing `useEditableField`
   exactly as Hero/CallToAction button labels and FeatureGrid features
   already do (`src/utilities/useEditableField.ts`). No changes to that hook,
   to `BlockFieldSync`, or to the message bridge: `resolveFieldTarget` in
   `src/custom/block-field-sync/Component.tsx` already resolves a `blockId`
   that matches no block row by falling back to a top-level field on the
   current form (its own comment calls out `Post`'s `body` and Settings'
   `siteName` as exactly this case) — `blockId: 'title'`/`'summary'` paired
   with matching `fieldPath` land there the same way `body` already does, so
   the existing accordion-expand/tab-switch/scroll machinery needs no new
   cases.
   - `title` is edited directly in `PostClient.tsx` (the `<Heading level={1}>`
     at line 44) since `PostPreview` never renders title in `variant="header"`.
   - `summary` is edited inside `PostPreview.tsx`, gated behind a new
     `isEditable` prop (default `false`) so the existing `FeaturedPost`
     block's unscoped call site (`variant="featured"`, a *different*
     document's Live Preview) is unaffected. Per `useEditableField`'s own
     doc comment, widen the `{summary && <p>...}` render guard with
     `isEditable` too, so clearing the field's last character doesn't
     unmount the node being typed into.
   - `PostPreview.tsx` needs a `'use client'` directive to call the hook.
2. For `author`, `category`, `date`, and `featuredImage` — fields that render
   on the same page but can never be click-to-edit text — add a hover hint
   reading "Edit in the Information tab", shown only while viewing this exact
   document in Live Preview (the same `isEditable` flag from step 1, no new
   signal). This is a same-document sibling of the existing
   `useCrossDocumentEditHint` pattern (`src/utilities/useCrossDocumentEditHint.ts`,
   `src/globals/_cross-document-hint.css`) — same hover-tooltip mechanism and
   `data-*` attribute convention, new CSS file co-located with
   `PostPreview.tsx` (next to the existing `src/components/_post-preview.css`),
   imported from `src/app/(frontend)/styles/index.css` alongside the other
   colocated component CSS. Does not reuse `data-cross-document-hint` itself —
   that attribute's CSS content is literally `"Open " + label + " to edit"`,
   which is the wrong wording for a field on the document you're already
   editing.
   - Wrap each `.post-preview__meta-item` (author/category/date) and the
     `featuredImage` `MediaImage` with the hint attribute when `isEditable`
     is true and `variant === 'header'`.

Nothing here changes what's actually saved — same Save flow, same
`informationTabSave` button, same form state — only what's reachable by
clicking inside the iframe.

### Addendum: reciprocal jump (iframe <-> sidebar)

Steps 1-2 cover iframe -> sidebar for `title`/`summary` only (clicking either
in the iframe already scrolls the sidebar to the matching field - confirmed
pre-existing, generic machinery in `resolveFieldTarget`/`BlockFieldSync`, no
code change needed). The gap is the reverse direction: focusing a field in
the sidebar does nothing to the iframe, for any of the six Information-tab
fields in scope.

Root cause: `BlockHoverSync`'s `onFocusIn` (`src/custom/block-hover-sync/Component.tsx`)
only posts `admin-field-focus` when the focused field resolves to a block/
array row (`findTopLevelRowAncestor`); a top-level document field like
`title` has no row, so it returns early. Separately, `PostClient.tsx` never
calls `useBlockSyncListener()` at all, so a Post page doesn't react to any
admin-originated sync message yet (forward direction's `block-field-focus`
is a different, already-wired message/listener pair).

Fix, mirroring the existing blockId-as-fieldPath convention from steps 1-2:

3. **Admin side** (`BlockHoverSync`'s `onFocusIn`): when the focused field
   has no row ancestor, fall back to checking whether it's a top-level field
   on the current form (`getField(fullPath)`) - same fallback
   `block-field-sync/Component.tsx`'s `resolveFieldTarget` already uses for
   the opposite direction. When it is, post
   `admin-field-focus` with `blockId` set to the field path itself (matching
   `blockId: 'title'`/`'summary'` from step 1, and extending the same
   convention to `author`/`category`/`date`/`featuredImage`).
4. **Frontend side, Post page**: call `useBlockSyncListener()` from
   `PostClient.tsx` (it currently calls nothing, so no admin-originated
   message - forward or back - is received there today). Extend
   `useBlockSyncListener`'s `admin-field-focus` case: when
   `message.blockId === message.fieldPath` (the top-level-field convention),
   skip the `[data-block-id]`-scoped lookup and instead match
   `[data-editable-field="<path>"]` OR `[data-information-tab-hint="<path>"]`
   directly. The hint attribute must therefore carry the field's own name as
   its value (e.g. `data-information-tab-hint="author"`), not an empty
   string - it already uniquely marks exactly the right element, this just
   makes it legible as a scroll target too. **Never reuse
   `data-editable-field` itself for the hint-only fields** -
   `_block-highlight.css` gives it `cursor: text` and a hover/focus dashed
   outline that signals "click here to edit," which is false for `author`/
   `category`/`date`/`featuredImage`.
   - `PostPreview.tsx`: set `data-information-tab-hint` to the field's name
     (`'author'`, `'category'`, `'date'`, `'featuredImage'`) instead of `''`.
   - New CSS: `[data-information-tab-hint]` also gets
     `scroll-margin-top: var(--header-offset, 0px)`, matching
     `[data-block-id]`/`[data-editable-field]`'s existing fixed-header
     allowance in `_block-highlight.css`.

Scope stays Posts-only, same six fields, same reasoning as steps 1-2 for why
Pages don't apply (nothing there to scroll to).

## Build steps

- [x] 1. **Wire `title` and `summary` to click-to-edit in the Post's own Live
   Preview.**
   - `PostClient.tsx`: apply `useEditableField({ blockId: 'title', fieldPath: 'title', value: data.title })` to the `<Heading level={1}>`.
   - `PostPreview.tsx`: add `isEditable?: boolean` prop; apply
     `useEditableField({ blockId: 'summary', fieldPath: 'summary', value: summary ?? '', multiline: true })`
     to the summary `<p>` when `isEditable` is true; widen its render guard
     per the hook's documented note; add `'use client'`.
   - `PostClient.tsx` passes `isEditable` into its `<PostPreview variant="header" .../>` call; `FeaturedPost`'s call site is untouched (prop defaults to `false`).
   - **Done when:** opening a Post in Live Preview, clicking its title or
     summary on the rendered page edits it in place and the sidebar's
     Information tab fields update live (matching how clicking into the body
     text already behaves); the blog listing's featured-post card (a
     different document) is unaffected.

- [x] 2. **Add the "Edit in the Information tab" hint for `author`/`category`/`date`/`featuredImage`.**
   - New colocated CSS (hover-only tooltip, same mechanism as
     `_cross-document-hint.css` but its own wording/attribute), imported from
     `src/app/(frontend)/styles/index.css`.
   - `PostPreview.tsx`: apply the hint attribute to the three meta items and
     the featured-image wrapper when `isEditable && variant === 'header'`.
   - **Done when:** hovering the author, category, date, or banner image on
     a Post's own Live Preview page shows the "Edit in the Information tab"
     tooltip; nothing changes on the blog listing/featured-post card.

- [x] 3. **Admin -> iframe: extend `onFocusIn` to top-level document fields.**
   - `src/custom/block-hover-sync/Component.tsx`: when `findTopLevelRowAncestor`
     finds no row, fall back to `getField(fullPath)` - if it resolves, post
     `admin-field-focus` with `blockId: fullPath, fieldPath: fullPath}`.
   - **Done when:** focusing `title`, `summary`, `author`, `category`, `date`,
     or `featuredImage` in a Post's Information tab posts an `admin-field-focus`
     message (observable via the message bridge) even though none of them sit
     inside a block/array row.

- [x] 4. **Frontend: receive it on the Post page and scroll to the right
   element.**
   - `PostClient.tsx`: call `useBlockSyncListener()` (currently not called at
     all on this page).
   - `src/utilities/useBlockSyncListener.ts`: in the `admin-field-focus` case,
     branch on `message.blockId === message.fieldPath` - the top-level-field
     convention from steps 1-3 - and match
     `[data-editable-field="<path>"], [data-information-tab-hint="<path>"]`
     directly instead of the `[data-block-id]`-scoped lookup.
   - `PostPreview.tsx`: give `data-information-tab-hint` the field's own name
     as its value instead of `''` (`'author'`/`'category'`/`'date'`/
     `'featuredImage'`).
   - New CSS: add `scroll-margin-top: var(--header-offset, 0px)` to
     `[data-information-tab-hint]`.
   - **Done when:** in a Post's own Live Preview, clicking into the Title,
     Summary, Author, Category, Date, or Featured Image field in the sidebar
     scrolls the iframe to the matching on-page element; nothing scrolls for
     a Page's Live Preview or a different post's listing card.

- [x] 5. **Bug fix: iframe -> sidebar tab-switch never completed for `title`/`summary`.**
   - Found after manual testing: clicking Title or Summary in the iframe
     left the sidebar on whatever tab was already active instead of
     switching to Information. Root cause in
     `src/custom/block-field-sync/Component.tsx`'s `expandTowardField`:
     `canTryTab` gated every tab-switch attempt behind
     `TAB_SWITCH_RESERVE_MS` (the last 1 of a 3s budget) regardless of
     whether there was anything to wait for. That reserve exists to let a
     field nested behind collapsibles on the *correct, already-active* tab
     finish rendering before concluding it's a tab problem - but `title`/
     `summary` have no row/collapsible chain at all (`chain` is always
     empty for a flat top-level field), so there was nothing to wait for,
     yet the fallback still sat through the same ~2s delay before ever
     trying "Information" - long enough to read as broken, and long enough
     to risk losing focus before it fired.
   - Fix: `canTryTab` now also allows an immediate attempt whenever
     `chain.length === 0` (nothing rendering-related left to wait for -
     either a top-level field with no wrapper at all, or a block row that
     doesn't exist yet because its own tab isn't active), independent of
     the time-based reserve. Existing nested-field timing (Hero/CallToAction
     button labels, etc. - `chain` is never empty there while their own tab
     is active) is unaffected.
   - **Done when:** clicking Title or Summary in the iframe switches the
     sidebar to the Information tab (if not already there) and scrolls to
     the field, without the earlier multi-second stall.

- [x] 6. **Real root cause: the sync bridges were unmounted outside their
   own tab.** Live testing (DOM inspection + a dependency-version-mismatch
   detour that turned out not to be it) isolated the actual bug: `title`
   had `contenteditable="true"` and `data-editable-field="title"` in the
   DOM (frontend wiring was correct), yet nothing synced to the sidebar
   even with Information already active - and Post `body` (pre-existing,
   unrelated to today's work) only worked while Content/Layout was already
   active, never on a cross-tab click either direction. Both symptoms trace
   to one cause: `blockHoverSync`/`blockFieldSync` (the two `ui` fields
   that run the entire admin<->iframe message bridge) were declared INSIDE
   the "Content / Layout" tab's own `fields` array, in both
   `src/collections/Pages/config.ts` and `src/collections/Posts/config.ts`.
   Payload's `TabsField` unmounts every inactive tab's fields entirely, so
   those two bridges - and their `window.addEventListener('message', ...)`
   listeners - only existed in the DOM while Content/Layout was the active
   tab. Every message posted while any OTHER tab (Information, SEO) was
   active went to nobody. This is a pre-existing bug (present since the
   bridge was first built for feature 28) that nothing had surfaced before,
   because every previously-editable field (Hero/CallToAction labels,
   RichTextBlock, FeatureGrid, Post body) lives inside a block, which is
   itself inside Content/Layout - so testing them while their own tab was
   already active (the natural way to reach a block in the first place)
   never exercised the cross-tab case. `title`/`summary` are the first
   editable fields to live in a *different* outer tab (Information),
   which is what finally exposed it.
   - Moved both `blockHoverSync` and `blockFieldSync` out of the
     "Content / Layout" tab to be top-level siblings of the outer `tabs`
     field itself, in both configs - so they mount unconditionally
     regardless of which tab is active. Both components render `null`
     (pure side-effect), so this is a placement-only change with no visual
     effect and no change to either component's own code.
   - (Unrelated but found along the way: `@payloadcms/live-preview` was
     pinned to `^3.89.0` while every other `@payloadcms/*` package is
     exactly `3.82.1`, which Payload's own startup check flags as an error.
     Pinned it to `3.82.1` to match. Confirmed by retest this wasn't the
     actual cause of the editing bug, but it's a real pre-existing
     misconfiguration worth having fixed regardless.)
   - **Done when:** with the sidebar on ANY tab (Information, Content/
     Layout, or SEO), clicking Title, Summary, or Post body in the iframe
     switches to the right tab and scrolls/highlights the field; typing
     syncs to the sidebar in all cases.

- [x] 7. **Asymmetric bug found by retest: switching INTO Information failed
   while switching INTO Content/Layout worked.** After step 6 landed:
   Information-tab-active same-tab editing works, and Information ->
   Content/Layout (clicking Post body) works, but Content/Layout ->
   Information (clicking Title) still didn't switch tabs. Root cause in
   `findFieldElement` (`src/custom/block-field-sync/Component.tsx`): its
   `.rich-text-lexical` fallback - needed because Lexical's own field
   wrapper never renders `id="field-<path>"`, unlike every other field type
   - was applied unconditionally whenever the `id`-based lookup failed,
   scoped only by `scope`. For a block row, `scope` genuinely contains at
   most one Lexical editor, so the fallback is unambiguous. For a top-level
   field (`scope: document.body`, e.g. `title`), `document.body` is the
   *whole document* - if Post's `body` (a real richText field) happened to
   be rendered because Content/Layout was the active tab, `title`'s own
   lookup fell through to that SAME unrelated `body` editor and read it as
   "already found." `fieldReached` came back true from the wrong element,
   so the tab-switch fallback in `expandTowardField` never ran at all -
   the code believed it had already reached `title` when it had actually
   matched `body`.
   - Fix: the `.rich-text-lexical` fallback is now skipped when
     `scope === document.body` unless `fullPath === 'body'` - the one
     top-level field that genuinely is richText. Block-row lookups
     (RichTextBlock's `content`) are unaffected.
   - **Done when:** Content/Layout -> Information (clicking Title or
     Summary) now switches tabs and scrolls correctly, matching the other
     two directions already confirmed working.

## Verify

- Open a Post in the admin, switch to Live Preview.
- Click the title in the iframe, type — sidebar's `title` field (Information
  tab) updates live; Save persists it.
- Click the summary paragraph, type (including clearing it to empty and
  retyping) — sidebar's `summary` field updates live; the paragraph element
  stays mounted and the caret doesn't jump.
- Hover the author name, category tag, date, and banner image — each shows
  the "Edit in the Information tab" tooltip; none of them are clickable/
  editable themselves.
- Open a Page that has a Featured Post or Blog Listing block referencing this
  Post, in that Page's own Live Preview — the embedded post card's title and
  summary are plain text again (not editable, no hint) since that card
  belongs to a different document.
- Open a Page in Live Preview — no behavior change (Pages never rendered
  Information-tab fields on the frontend, so there's nothing to click there).
- Click into the Title field in the sidebar - the iframe scrolls to the
  `<h1>` title. Same for Summary (scrolls to the summary paragraph), Author,
  Category, Date, and Featured Image (each scrolls to its own meta
  item/banner image).
- Hovering the author/category/date/featuredImage elements still shows the
  "Edit in the Information tab" tooltip (unchanged by the hint attribute now
  carrying a field name instead of an empty string).
- Open a Page in its own Live Preview and focus any of its sidebar fields -
  nothing scrolls in that Page's iframe (no matching
  `data-editable-field`/`data-information-tab-hint` element exists there).

All of the above was confirmed live against the running dev server (not just
build/lint) after each fix in this sequence, including the two bugs (steps 5
and 7) found only by that live testing.
