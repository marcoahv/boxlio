# Current Feature

**Status:** verified
**Branch:** `feature/standardize-block-admin-tabs`

## Goal

Feature 31. Hero's admin-panel editing pattern - fields grouped into a
"Content" tab and a "Layout" tab, with `field-label--sidebar-badge` styling
(a bordered box + dark pill label) on every field except checkboxes - is
already the block Component.tsx render shape every block follows (see
Hero's Component.tsx doc comment: "Reference implementation for a block").
It is *not* yet the admin **config** shape: `FeatureGrid`, `CallToAction`,
`RichTextBlock`, `Table`, `Featured Post`, and `Blog Listing` all still use a
flat field list with no tab grouping and no badge styling. This feature
brings every block's `config.ts` field organization in line with Hero's, so
every block's edit UI in the admin panel looks and groups fields the same
way.

This is an admin-editing-experience consistency change only. It does not
change the public frontend, stored data shape, or any `Component.tsx`
render logic.

## In scope

- Wrap each listed block's fields in a `type: 'tabs'` field with a "Content"
  tab (the block's actual content - headings, body text, media, links,
  array items, rich text) and a "Layout" tab (the block's own presentational
  controls - `surface` from `appearanceField()`, plus any other
  layout/structural choice the block has), matching Hero's `config.ts`
  exactly (unnamed tabs, so no data-shape or path change).
- Add `admin: { className: 'field-label--sidebar-badge' }` (merged with any
  existing `className`, e.g. `field-row--no-stack`) to every field placed
  directly inside a Content or Layout tab, **except** checkbox fields -
  matching Hero, which does not badge `videoLoop`/`videoHideControls`.
- Blocks in scope: `FeatureGrid`, `CallToAction`, `RichTextBlock`, `Table`
  (shared registry, `src/blocks/`), and `Featured Post`, `Blog Listing`
  (blog-only registry, `src/collections/Pages/blogBlocks/`).
- `Featured Post` has no content fields at all (only `surface`) - give it a
  **Layout tab only**, no empty Content tab.

## Out of scope

- Any change to a block's stored fields, field types, defaults, or
  validation. `columns` (FeatureGrid) and `align` (CallToAction) keep their
  current field type (`select`/`radio` respectively) - this feature adds
  tabs and badge styling, not a dropdown-to-radio conversion.
- Any change to `Component.tsx` render logic for any block - the render
  shape is already standardized (see Goal).
- `Hero` itself - already the reference implementation.
- Forcing array rows open (Hero's separate `hero-buttons-array` class, which
  disables the row-collapse toggle) - not requested, and unrelated to tabs
  or badge styling. `features`, `links`, and `rows` keep their current
  collapse behavior.
- Nested sub-fields one level below a block's own array (e.g. `features[].title`,
  `links[].label`, `rows[].cells`) - these stay unstyled, matching how
  Hero's own `links[].label`/`links[].url`/etc. stay unstyled inside the
  badged `links` array wrapper (see the CSS's own `.array-field__row
  .field-label` reset rule).
- `project-plan.md` and `project-overview.md` - this doesn't change product
  direction, data, or the public UI, only the CMS editing experience, and
  the overview only lists shipped features.
- A pre-existing, unrelated bug found during manual verification (see Notes
  for the AI): Table's "Edit" accordion is stuck collapsed when embedded in
  a Post's Lexical `body`, reproduced even with `Table/config.ts` fully
  reverted to its pre-feature state. Not caused by this feature and not
  fixed by it - left for a future `/debug` or `/fix`.

## Build loop

Per `blueprint/config.json`: `workflow.stepReview: "feature"` and
`workflow.checkpointCommits: "disabled"`. Implement all build steps below in
order without pausing for approval between them, and without intermediate
checkpoint commits. Present one combined review packet after the final step
(including the final verification step's evidence), then stop for review
before `/complete`.

## Build steps

- [x] 1. **FeatureGrid** (`src/blocks/FeatureGrid/config.ts`) - Content tab:
  `heading`, `intro`, `features`. Layout tab: `surface`
  (`...appearanceField()`), `columns`. Badge every field above except none
  are checkboxes here. Done when: the admin panel's FeatureGrid block shows
  Content/Layout tabs with badged fields, `npm run build` (typecheck) passes,
  and an existing saved FeatureGrid still renders identically on the
  frontend.
- [x] 2. **CallToAction** (`src/blocks/CallToAction/config.ts`) - Content
  tab: `heading`, `body`, `links` (keep `links[].label`/`links[].url`'s
  existing `field-row--no-stack` row className untouched; badge only the
  outer `links` array field). Layout tab: `surface`, `align`. Done when: the
  admin panel's CallToAction block shows Content/Layout tabs with badged
  fields, typecheck passes, and an existing saved CallToAction still renders
  identically.
- [x] 3. **RichTextBlock** (`src/blocks/RichTextBlock/config.ts`) - Content
  tab: `content`. Layout tab: `surface`. Hero has no `richText`-type field,
  so there's no existing precedent for how the badge border looks around
  Lexical's toolbar - apply it, then check visually in step 7; if it visibly
  clashes with the editor chrome, drop the className from `content` only and
  note that exception in Testing. Done when: the admin panel's RichTextBlock
  shows Content/Layout tabs, typecheck passes, and an existing saved
  RichTextBlock still renders identically.
- [x] 4. **Table** (`src/blocks/Table/config.ts`) - Content tab: `heading`,
  `rows` (badge the outer `rows` array only - the nested `cells` array and
  its `content` richText field stay unstyled, same reasoning as step 3).
  Layout tab: `surface`, `hasHeaderRow` (checkbox - no badge). Same
  Content/Layout tab treatment as every other block - see Notes for the AI
  for why an initial hypothesis about Lexical-embedded blocks and `tabs`
  breaking here was tested and ruled out. Done when: the admin panel's Table
  block shows Content/Layout tabs, typecheck passes, and an existing saved
  Table still renders identically (confirmed via the Home page's `blocks`
  field, per Notes for the AI).
- [x] 5. **Featured Post** (`src/collections/Pages/blogBlocks/FeaturedPost/config.ts`) -
  Layout tab only: `surface`. No Content tab (no content fields exist).
  Keep the existing `editAccordionField(...)` wrapper. Done when: the admin
  panel's Featured Post block shows one Layout tab with a badged `surface`
  field, typecheck passes, and an existing page's Featured Post block still
  renders identically.
- [x] 6. **Blog Listing** (`src/collections/Pages/blogBlocks/BlogListing/config.ts`) -
  Content tab: `heading`. Layout tab: `surface`. Keep the existing
  `editAccordionField(...)` wrapper. Done when: the admin panel's Blog
  Listing block shows Content/Layout tabs with badged fields, typecheck
  passes, and an existing Blog Listing block still renders identically.
- [x] 7. **Cross-block verification** - run `npm run generate:types` and
  confirm the only diff in `src/payload-types.ts` is property reordering
  (see Data / contracts) - no field added, removed, renamed, or retyped.
  Run `npm run lint` and `npm run build`. In the
  admin panel, open a Page containing at least one of each block (or add one
  temporarily) and confirm: each block's Edit accordion opens to Content and
  Layout tabs as specified above; badge styling appears on the right fields
  and not on `hasHeaderRow`; Live Preview still reflects edits for at least
  one inline-editable field per block (e.g. Hero's heading still works
  as a control, confirming the tabs change on other blocks didn't regress
  the shared bridge); resolve the step 3/4 richText-badge visual check here
  and record the outcome. Done when: all of the above hold and both
  typecheck and build are green.

  **Result:** `generate:types` diff is exactly the expected property
  reordering (12 lines, 5 blocks) - confirmed by inspection, no field
  added/removed/renamed. `npm run lint` and `npm run build` both pass clean
  (pre-existing warnings only, none in touched files). Manually confirmed in
  the admin (Home page's `blocks` field: Hero, CallToAction, FeatureGrid,
  RichTextBlock, Table; Blog page: Featured Post, Blog Listing): all six
  blocks show the correct Content/Layout tab split with badge styling in
  the right places. The richText badge (steps 3/4) was confirmed to look
  fine against the Lexical toolbar on both RichTextBlock and Table's nested
  cells - kept, no exception needed. Live Preview spot-checked via Hero's
  heading, unaffected by the other blocks' tabs changes. See Notes for the
  AI for a pre-existing, unrelated bug found (and ruled out as unrelated to
  this feature) during Table's verification.

## Files / areas

- `src/blocks/FeatureGrid/config.ts`
- `src/blocks/CallToAction/config.ts`
- `src/blocks/RichTextBlock/config.ts`
- `src/blocks/Table/config.ts`
- `src/collections/Pages/blogBlocks/FeaturedPost/config.ts`
- `src/collections/Pages/blogBlocks/BlogListing/config.ts`
- Reference only, not edited: `src/blocks/Hero/config.ts` (the pattern being
  matched), `src/app/(payload)/custom.scss` (defines `.field-label--sidebar-badge`
  and `.field-row--no-stack`, already generic - no CSS changes expected),
  `src/fields/appearance.ts` (`appearanceField()` already supports a
  `className` param), `src/blocks/registry.ts` and `src/blocks/index.tsx`
  (wire the shared-registry blocks; untouched - only each block's own field
  list changes shape, the registry's block list and `blockComponents` map
  are unaffected).

## Data / contracts

No change to any field's name, type, optionality, or the stored document
shape. `type: 'tabs'` fields without a `name` are a pure admin-UI grouping
construct - every field keeps its current top-level name and path (proven
by Hero, whose tabs never affected `HeroBlock`'s stored document shape).

Confirmed during implementation: `npm run generate:types` **does** reorder
properties in `FeatureGridBlock`, `CallToActionBlock`, `RichTextBlock`,
`TableBlock`, and `BlogListingBlock` (`surface`/`columns`/`align`/
`hasHeaderRow` move to appear after the content fields, matching each
block's new Content-then-Layout field order) - this is expected, not a
regression: TypeScript interfaces are structurally typed, so property order
carries no functional meaning, and Payload's generator always mirrors
config field order. `FeaturedPostBlock`'s single-field interface is
unchanged. No field is added, removed, renamed, or changes type, anywhere.

## Testing

This is a Payload admin-config field-organization change, not new logic -
per `coding-standards.md`'s testing scope rule, this is a "what not to
test" UI/integration surface, verified with the running app and the build,
not a new unit test. No new file under `tests/int/` is expected.

- `npm run build` (typecheck) after each step.
- `npm run generate:types` once at the end (step 7) - expect no diff.
- `npm run lint` at the end (step 7).
- Manual admin-panel check (step 7): tabs, badge placement, and an existing
  page's saved content for each touched block, in both the admin edit view
  and Live Preview. Confirmed - see step 7's Result.

## Notes for the AI

- Mechanical, low-risk, one small `config.ts` edit per step - resist adding
  anything beyond tabs + badge className (see Out of scope).
- Copy Hero's exact tab shape (`{ type: 'tabs', tabs: [{ label: 'Content',
  fields: [...] }, { label: 'Layout', fields: [...] }] }`) rather than
  inventing a variant.
- When merging `field-label--sidebar-badge` into a field that already has a
  `className` (CallToAction's `links[].label`/`url` row uses
  `field-row--no-stack`, but that row is nested *inside* `links`, not the
  `links` field itself - the outer `links` field currently has no
  className, so no merge is actually needed there; double-check each field
  individually rather than assuming).
- Steps 3 and 4's richText badge question was resolved in step 7: it looks
  fine, kept as-is.
- **False lead, recorded so it isn't re-investigated**: while verifying
  step 4, the user reported Table's "Edit" accordion stuck collapsed and
  unopenable when editing it inside a Post's Lexical `body` (specifically
  the "personality-01-serious--elegant" post). This looked like a real
  regression from adding `tabs` to Table - `Table` is the only block with
  actual content embedded in a post body today, so it was the first to
  possibly expose a `type: 'tabs'`-inside-Lexical incompatibility (Lexical's
  `BlocksFeature` renders with `forceRender: true`, unlike the Pages
  `blocks` field's lazy mount - see
  `node_modules/@payloadcms/richtext-lexical`'s `BlockContent.js`).
  Reverting Table's tabs (keeping flat fields + badges) did **not** fix it.
  Reverting `Table/config.ts` to be **byte-identical to `main`** (zero
  changes from this feature) still did not fix it, even after a full
  `rm -rf .next` + dev-server restart. This conclusively rules out anything
  in this feature as the cause - it's a pre-existing bug in that specific
  post's Table block (or in Lexical-embedded block editing generally),
  unrelated to Content/Layout tabs or badge styling. Table's config was
  restored to the full tabs + badge treatment (step 4, matching every other
  block) once this was established. Verify Table visually via the Home
  page's `blocks` field (already confirmed working there), not via that
  post's Lexical body.

## Findings

_No findings were resolved as part of this feature. The ledger's existing
F-05 and F-06 (both P3, unrelated to this work) remain open in
`blueprint/context/findings.md`._
