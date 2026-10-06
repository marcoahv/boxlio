## Eliminate the Information tab's Edit accordion (Pages + Posts)

**Type:** Fix
**Status:** verified
**Branch:** `fix/eliminate-information-tab-edit-accordion`

### The problem

Both `src/collections/Pages/config.ts` and `src/collections/Posts/config.ts`
wrap their Information tab's real fields (`title`, slug, `featuredImage`, and
for Posts also `summary`/`featured`/`author`/`category`/`date`/
`populatedAuthor`) inside a `type: 'collapsible'` labeled `"Edit"`
(`admin.className: 'info-tab-edit-collapsible'`, `initCollapsed: true`),
alongside two `ui` fields:

- `informationTabEditAutoCollapse` -> `InformationTabEditAutoCollapse`
  (`src/custom/information-tab-edit-autocollapse/Component.tsx`): forces the
  accordion closed on load, auto-collapses it on blur/mouseleave, nudges the
  Save button instead of silently collapsing with unsaved changes, and blocks
  switching tabs while something's unsaved.
- `informationTabSave` -> `InformationTabSaveButton`
  (`src/custom/information-tab-save/Component.tsx`): a plain, self-contained
  `<SaveButton />` wrapper - confirmed to have no dependency on the
  collapsible (already reused standalone in Posts' "Content / Layout" tab).

### The fix

Remove the `"Edit"` collapsible wrapper from both collections' Information
tab, so `title`/slug/etc. become flat, direct siblings of the timestamp `row`
- same flattening already done to `breadcrumbsField()` earlier this session.

- Drop the `informationTabEditAutoCollapse` field entirely from both
  Information tabs (nothing left for it to auto-collapse). **Do not** touch
  `InformationTabEditAutoCollapse`'s component file itself, or
  `editAccordionField()` (`src/fields/editAccordion.ts`) - every page-builder
  block still uses that exact component (with
  `skipForcedCollapseIfFresh: true`) for its own "Edit" accordion, which is
  untouched by this fix.
- Keep `informationTabSave`, just un-nested - move it to be the first field
  in each Information tab's `fields` array (right after the timestamp `row`),
  matching how the "Content / Layout" tab already places its own
  `contentLayoutTabSave`.
- In `src/custom/admin-timestamps/styles.css`, remove the two rules (and
  their explanatory comment, lines ~37-59) scoped
  `.info-tab-edit-collapsible:not(.block-edit-collapsible)` - they branded
  the Information tab's own collapsible border and become dead with no
  collapsible left to match. **Do not** touch line 33's
  `.info-tab-edit-collapsible .row-label` rule - it has no `:not()` exclusion,
  so it also styles every block's own "Edit" accordion label today; update
  only its comment to stop describing a Pages/Posts Information-tab pattern
  that no longer exists.

Must not change any field `name` - `title`, `slug`, `summary`, `featured`,
`author`, `category`, `date`, `populatedAuthor`, `featuredImage` all keep
their names and positions relative to each other, just unwrapped. No
stored-data migration, no expected diff in generated types.

### Build steps

- [x] **Step 1 - Flatten both Information tabs and clean up the dead CSS**

  In `src/collections/Pages/config.ts` and `src/collections/Posts/config.ts`:
  remove the `"Edit"` `collapsible` field, remove
  `informationTabEditAutoCollapse`, and splice the collapsible's remaining
  fields (starting with `informationTabSave`, then the rest in their
  existing order) directly into the Information tab's own `fields` array,
  right after the timestamp `row`.

  In `src/custom/admin-timestamps/styles.css`: delete the
  `:not(.block-edit-collapsible)` comment block and its two border-color
  rules; update line 33's comment to reflect that it now only affects
  blocks' own "Edit" accordion label.

  Done when:

  - [x] Neither `Pages/config.ts` nor `Posts/config.ts` contains a
    `type: 'collapsible'` field anywhere in its Information tab, and neither
    references `informationTabEditAutoCollapse` or
    `info-tab-edit-collapsible` anymore. Confirmed by grep: the only
    remaining references are in `editAccordion.ts` and
    `information-tab-edit-autocollapse/Component.tsx` (blocks' own
    mechanism) and the one CSS rule deliberately kept for them.
  - [x] Both Information tabs still render `informationTabSave` as their
    first field, followed by every pre-existing field in its original
    relative order.
  - [x] `src/custom/information-tab-edit-autocollapse/Component.tsx` and
    `src/fields/editAccordion.ts` are unchanged - confirmed with
    `git diff --stat` (empty).
  - [x] `npm run generate:types` runs clean with no diff to
    `src/payload-types.ts` (removing an unnamed `collapsible` wrapper is
    admin-only; field names/shapes are unchanged).
  - [x] `npm run lint` and `npm run build` pass. `npm run test:int` also run:
    112/112 passing, including `editAccordion.int.spec.ts` (blocks'
    mechanism unaffected).

  **Actual result:** also fixed one knock-on stale comment the spec didn't
  anticipate - the next CSS rule down (`.block-edit-collapsible >
  .collapsible { border-color: transparent !important; }`) had its own
  comment referencing "the rule above excludes it", pointing at the
  `:not(.block-edit-collapsible)` rule just deleted. Reworded to state
  directly that nothing brands that inner border, rather than leaving a
  dangling reference to a rule that no longer exists.

### Verify

1. `npm run dev`, open the admin panel, edit any existing Page and any
   existing Post.
2. Confirm the Information tab shows a Save button immediately, with
   `title`/slug/etc. visible directly below it - no "Edit" header to click,
   no collapsible border.
3. Confirm every field still edits and saves normally (title, slug, summary,
   featured checkbox, author/category relationships, date, featured image).
4. Open a block's own "Edit" accordion (e.g. Hero on a Page) and confirm its
   auto-collapse/nudge/Save behavior is unchanged - this fix must not affect
   blocks.
