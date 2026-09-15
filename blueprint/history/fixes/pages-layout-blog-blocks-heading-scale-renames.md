# Current Feature

**Title:** Rename the Pages "Layout" tab to "Content"
**Type:** Fix
**Status:** verified
**Branch:** `fix/rename-layout-tab-to-content`

## The problem

In the Payload admin, editing the Home page (a `pages` document) shows a tab
labeled **Layout** that holds the `blocks` field (the page-builder blocks like
Hero, FeatureGrid, etc.). "Content" is a clearer label for what an editor is
actually doing there. Payload tabs are defined once on the collection config,
not per document, so this tab is shared by every `pages` document (Home,
Blog, and any future page) - there's no mechanism to rename it for Home only.

Extended in-place (before `/complete`): the Blog page's own tab, currently
labeled **Blog Content** (holds the `blogBlocks` field, itself already
labeled "Blog Blocks"), should also become **Blog Blocks** for the same
reason - a clearer, more specific label for what's actually in it.

Extended in-place again (before `/complete`), unrelated area bundled in at
the user's explicit choice: Settings -> Typography's **Heading Scale**
field has an option labeled "Bold" (`value: 'lg'`) that only scales heading
*size* (1.15x via `--heading-scale`), never font-weight - the label
misleadingly implies a weight change. Rename it to **"Large"**, matching the
Compact/Default/[size-word] pattern the field's other two options already
use.

## The fix

In `src/collections/Pages/config.ts`, rename the tab's `label` from `'Layout'`
to `'Content'` (line ~58). This is a display-only label; the field name inside
it (`blocks`) is unchanged, so no data migration, no `generate:types` schema
change beyond the regenerated JSDoc comment.

Also update the one other place in the same file that mentions the old label
by name: the "Blog Content" tab's `blogBlocks` field description ("Add a Hero
block (Layout tab) above them for a heading.") should read "(Content tab)"
instead, so the in-admin hint still points editors to the right tab.

Then rename the "Blog Content" tab's own `label` (line ~72) to `'Blog
Blocks'`. Its `blogBlocks` field (line ~82) already carries that same label
for the field itself - after this change the tab heading and the one field
inside it read identically ("Blog Blocks" / "Blog Blocks"), which is
intentional per the user's explicit request, not an oversight.

Then, in `src/globals/Settings/config.ts`, rename `headingScale`'s `'lg'`
option `label` from `'Bold'` to `'Large'` (line ~264). Value (`'lg'`) and
behavior are unchanged - display label only, same as every other rename in
this spec.

Must not:
- Change the `blocks` or `blogBlocks` field's `name`, options, or behavior.
- Touch either Pages tab's `condition` (Blog tab still gated on
  `data?.slug === 'blog'`).
- Rename anything in a different collection/global - only `Pages`'s two tabs
  and `Settings`'s `headingScale` option are touched.
- Change `headingScale`'s `value: 'lg'`, its `defaultValue`, or the
  `--heading-scale` CSS behavior it drives - label only.

## Build steps

- [x] 1. **Rename the tab label and its one cross-reference.** Change
  `label: 'Layout'` to `label: 'Content'` in the "Layout" tab of
  `src/collections/Pages/config.ts`. Update the `blogBlocks` field's
  `admin.description` in the same file to say "(Content tab)" instead of
  "(Layout tab)". Run `npm run generate:types` to refresh the regenerated
  JSDoc comment in `payload-types.ts`. **Done when:** `npm run build` and
  `npm run lint` pass; in `/admin`, editing the Home page (or any `pages`
  document) shows a tab labeled "Content" instead of "Layout" in the same
  position, still containing the same blocks editor; the Blog page's "Blog
  Content" tab description now says "(Content tab)".

- [x] 2. **Rename the "Blog Content" tab to "Blog Blocks".** Change
  `label: 'Blog Content'` to `label: 'Blog Blocks'` on that tab in
  `src/collections/Pages/config.ts` (the `blogBlocks` field's own label stays
  "Blog Blocks", unchanged). Run `npm run generate:types`. **Done when:**
  `npm run build` and `npm run lint` pass; in `/admin`, editing the Blog page
  document shows the tab itself labeled "Blog Blocks" (previously "Blog
  Content"), still gated to only the `blog`-slug page, still containing the
  same `blogBlocks` field and its description.

- [x] 3. **Rename Heading Scale's "Bold" option to "Large".** Change
  `{ label: 'Bold', value: 'lg' }` to `{ label: 'Large', value: 'lg' }` in
  `headingScale`'s `options` array in `src/globals/Settings/config.ts`. Run
  `npm run generate:types`. **Done when:** `npm run build` and `npm run
  lint` pass; in `/admin` -> Settings -> Typography, the Heading Scale field
  shows Compact/Default/Large (not Bold); the previously-saved value (`lg`)
  still resolves to the same option, now showing "Large" selected.

## Verify

`npm run dev`, open `/admin/collections/pages`, edit the Home document:
confirm the second tab reads "Content" (not "Layout") and still shows the
existing blocks list untouched. Open the Blog page document and confirm its
former "Blog Content" tab now reads "Blog Blocks" and its description text
says "(Content tab)". Open Settings -> Typography and confirm Heading Scale's
third option reads "Large" (not "Bold"), with no change to which sites'
headings that option actually scales.
