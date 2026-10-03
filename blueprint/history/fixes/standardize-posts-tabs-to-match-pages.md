## Standardize Posts tabs to match Pages

**Type:** Fix
**Status:** verified
**Branch:** `fix/standardize-posts-tabs-to-match-pages`

### The problem

`src/collections/Posts/config.ts` groups its admin tabs differently than
`src/collections/Pages/config.ts`, even though both already share the same
"Information" tab pattern (timestamp row + collapsible "Edit" section).

- Pages' builder-style tab is labeled **"Content / Layout"**.
- Posts splits the same kind of content into two separate tabs: **"Appearance"**
  (`breadcrumbs`, `headerAppearance`, `bodyAppearance` groups) and **"Content"**
  (`body` richText + `blockFieldSync`).

Scope note: an earlier investigation considered also adding Pages'
`blockHoverSync` field to Posts' content tab. That field only works for
Payload's native top-level `blocks` field rows (`src/utilities/blockRowLookup.ts`
resolves hover targets via the `[id*="-row-"]` convention Payload renders for
those rows). Posts' blocks are embedded inside Lexical rich text via
`BlocksFeature` and never render that row id - `block-hover-sync/Component.tsx`
already documents this as intentionally out of scope. The frontend converter
(`src/components/RichText/converters/index.tsx`) enforces the same boundary from
the other side, wrapping every embedded block in
`EditableFieldProvider value={false}` specifically because "the admin side
can't resolve [a blockId]" for them. Reversing that on both ends to build real
Lexical hover-sync is a new subsystem, not a tab edit - **out of scope for this
fix**. Spec it separately with `/feature` if wanted later.

### The fix

In `src/collections/Posts/config.ts`:

1. Rename the **"Content"** tab's `label` to `"Content / Layout"`.
2. Move the three groups currently under the **"Appearance"** tab
   (`breadcrumbs`, `headerAppearance`, `bodyAppearance` - same `name`s,
   `label`s, `admin.description`s, and field builders, unchanged) into the
   renamed `"Content / Layout"` tab, ordered before the `body` richText field.
3. Delete the now-empty `"Appearance"` tab entry from the `tabs` array.
4. Leave `blockFieldSync` as the last field in the tab, after `body`
   (unchanged). Do **not** add `blockHoverSync` (see scope note above).

Resulting tab order: **Information -> Content / Layout -> SEO**.

Within the "Content / Layout" tab, nest a `type: 'tabs'` field mirroring the
Content/Layout inner-tab pattern every block already uses (`src/blocks/Hero/config.ts`
and the others standardized in the "standardize block admin tabs" feature):
an inner **"Content"** tab holding `body`, and an inner **"Layout"** tab
holding `breadcrumbs`, `headerAppearance`, `bodyAppearance` (in that order).
`blockFieldSync` stays a sibling after the nested tabs field, not inside
either inner tab, since it's an invisible sync bridge, not content or layout.

Must not change any field `name`, so no stored-data migration and no expected
diff in generated types.

### Build steps

**Step 1 - Merge the Appearance tab into a renamed Content / Layout tab** ✅

In `src/collections/Posts/config.ts`, rename the `"Content"` tab to
`"Content / Layout"`, move the `breadcrumbs`/`headerAppearance`/`bodyAppearance`
group fields from the `"Appearance"` tab into it (before `body`), and remove
the `"Appearance"` tab entry.

Done when:

- [x] The `tabs` array has exactly 4 entries: Information, Content / Layout,
  SEO - no standalone Appearance tab.
- [x] The `"Content / Layout"` tab's fields, in order, are: `breadcrumbs` group,
  `headerAppearance` group, `bodyAppearance` group, `body` richText,
  `blockFieldSync` ui field.
- [x] `npm run generate:types` runs clean with no diff to `src/payload-types.ts`
  (tab grouping is admin-only; field names/shapes are unchanged).
- [x] `npm run lint` passes.

**Step 2 - Nest inner Content/Layout tabs, mirroring every block's pattern** ✅

In the "Content / Layout" tab, replace the flat field list with a nested
`type: 'tabs'` field: inner "Content" tab = `body`; inner "Layout" tab =
`breadcrumbs`, `headerAppearance`, `bodyAppearance`. `blockFieldSync` stays
a sibling after the nested tabs field.

Done when:

- [x] The "Content / Layout" tab's `fields` are: one nested `tabs` field
  (inner tabs "Content" -> `body`, "Layout" -> `breadcrumbs`/
  `headerAppearance`/`bodyAppearance`), then `blockFieldSync`.
- [x] `npm run generate:types` runs clean. Regenerating produced a diff
  limited to property declaration order in `Post`/`PostsSelect` (`body` now
  precedes `breadcrumbs`/`headerAppearance`/`bodyAppearance`, matching the
  new field order) - no field added, removed, renamed, or retyped. Diff
  reviewed and accepted.
- [x] `npm run lint` passes.
- [x] `npm run build` compiles successfully.

**Step 3 - Mirror blocks' `field-label--sidebar-badge` styling on the matching fields** ✅

Blocks badge their Content/Layout tab fields with `admin.className:
'field-label--sidebar-badge'` (dark pill label + bordered box - see
`src/app/(payload)/custom.scss:86-99`). Applied the exact existing precedent:

- `body` richText: `admin.className: 'field-label--sidebar-badge'`, matching
  `RichTextBlock`'s own `content` field exactly (`src/blocks/RichTextBlock/config.ts:16-26`).
- `headerAppearance`/`bodyAppearance` groups: `appearanceField(undefined,
  'field-label--sidebar-badge')`, the same call every block's Layout tab
  already makes.

Left `breadcrumbsField()` (the `collapsible` wrapping `show`/`surface`)
unstyled: no block pairs this badge with a `collapsible`-wrapped field
anywhere in the codebase, and `breadcrumbsField()` has no `className`
extension point today. Flagged rather than guessed at a new, unverified
combination - revisit if a visual check wants it extended too.

Done when:

- [x] `body`, and the `surface` field inside `headerAppearance` and
  `bodyAppearance`, carry `field-label--sidebar-badge`, matching blocks'
  own usage 1:1.
- [x] `npm run lint` passes.
- [x] `npm run build` compiles successfully.

**Step 4 - Flatten breadcrumbsField and extend its badge styling** ✅

Removed the `collapsible`/"Appearance" label wrapper from `breadcrumbsField()`
(`src/fields/appearance.ts`) - only call site is Posts, confirmed by grep, so
safe at the source. `show`/`surface` are now flat siblings directly under the
`breadcrumbs` group, same shape as every other field in this tab. Added a
`className` param (mirroring `appearanceField()`'s own), so Posts now passes
`breadcrumbsField('field-label--sidebar-badge')` - resolving the gap flagged
last step (no precedent existed for badge + collapsible; removing the
collapsible made that moot) and completing full styling parity across the
Layout tab.

Done when:

- [x] `breadcrumbsField()` returns `show`/`surface` as flat fields, no
  `collapsible` wrapper, no "Appearance" label.
- [x] Both fields carry `field-label--sidebar-badge` via the new `className`
  param, matching `headerAppearance`/`bodyAppearance`/`body`.
- [x] `npm run lint` passes.
- [x] `npm run build` compiles successfully.
- [x] `npm run generate:types` diff unchanged from Step 2's already-accepted
  order-only diff (an unnamed `collapsible` carries no data shape, so removing
  it changes nothing in generated types).

**Step 5 - Add a sibling Save button to the Content / Layout tab** ✅

The Information tab (Pages/Posts) and every block's own "Edit" accordion
(`editAccordionField`) mount `InformationTabSaveButton`
(`src/custom/information-tab-save/Component.tsx` - a self-contained wrapper
around Payload's own `<SaveButton />`, no dependency on a collapsible
ancestor) as a convenience so editors don't have to leave a busy tab to find
Save. The "Content / Layout" tab had no such button. Added it as
`contentLayoutTabSave`, a `ui` field, first in the tab's `fields` (before the
nested Content/Layout tabs), using the same shared component - distinct field
`name` per usage site, matching the project's existing convention
(`informationTabSave` / `blockEditSave` already coexist this way).

Not changed: Pages' "Content / Layout" tab has no save button either and was
out of scope here (this fix is about Posts); flagged for parity if wanted
later.

Done when:

- [x] `contentLayoutTabSave` renders Payload's `<SaveButton />` at the top of
  Posts' "Content / Layout" tab, functionally saving the document.
- [x] `npm run lint` passes.
- [x] `npm run build` compiles successfully.
- [x] `npm run generate:types` diff unchanged (a `ui` field carries no data
  shape).

### Verify

1. `npm run dev`, open the admin panel, edit any existing Post.
2. Confirm the tab row reads **Information | Content / Layout | SEO** (no
   separate "Appearance" tab).
3. Open "Content / Layout" and confirm breadcrumbs, hero section, and body
   section styling controls all appear above the post body editor, and the
   body richText field still edits and saves normally.
4. Confirm Live Preview still updates when editing breadcrumbs/appearance
   fields and the post body (unchanged behavior, just relocated).
