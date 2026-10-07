# Current Feature

**Status:** verified

**Branch:** feature/testimonials-logo-cloud

## Goal

Add two more shared-registry blocks — **Testimonials** and **Logo Cloud** — continuing
build-plan item 33 ("Common content blocks") after 33a shipped Accordion/Stats. Both
follow the registry's established per-block contract (Content/Layout admin tabs,
`appearanceField()`, the automatic Edit accordion, `data-block-id` hover-sync, and
per-block `useEditableField` inline text editing) and reuse `MediaImage` for their
media.

## In scope

- New `Testimonials` block (slug `testimonials`): optional heading, required array of
  `quote`/`author`/optional `avatar`, rendered as a card grid.
- New `Logo Cloud` block (slug `logoCloud`): optional heading, required array of
  `logo` images, rendered as a wrapping row.
- Registering both in `src/blocks/registry.ts` so they appear in Pages' block picker
  and rich-text block-embedding automatically — nothing else in `collections/Pages`
  changes.
- Regenerating `payload-types.ts` for the two new block interfaces.

## Out of scope

- `33c` Carousel — separate future build-plan item.
- A custom array `RowLabel` admin component for either block — `Accordion`/`Stats`
  precedent uses Payload's plain default row label; the build-plan line names no
  row-label requirement.
- A `columns` layout control for Logo Cloud — it renders as a single wrapping row, not
  a fixed-column grid (see Notes for the AI).
- A per-item link/URL on Logo Cloud logos, or a role/title field on Testimonials'
  authors — not in the build-plan's field list (`quote/author/avatar`; `logo grid`).
- Any change to `Posts.body`'s Lexical block-embedding mechanism, or to
  `tests/int/blockRowLookup.int.spec.ts` / `blockSyncMessages.int.spec.ts` — both are
  already generic across block slugs.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement both build steps below in one pass with
no per-step approval pause and no checkpoint commits, then present one review packet
covering both blocks.

## Build steps

- [x] 1. **Testimonials block**
  - `src/blocks/Testimonials/config.ts` — slug `testimonials`, `interfaceName:
    'TestimonialsBlock'`. Content tab: optional `heading` (text,
    `field-label--sidebar-badge`); required `items` array (`minRows: 1`, labels
    Testimonial/Testimonials, same className) with `quote` (textarea, required),
    `author` (text, required), `avatar` (upload → `media`, optional — same
    optionality as `FeatureGrid.features[].image`). Layout tab:
    `...appearanceField(undefined, 'field-label--sidebar-badge')` plus a `columns`
    select, options Two/Three/Four, default `'3'` — the same options list and
    default `FeatureGrid` already uses.
  - Run `npm run generate:types` so `TestimonialsBlock` exists in `payload-types.ts`
    before writing the component.
  - `src/blocks/Testimonials/Component.tsx` — follow `FeatureGrid`'s shape: a
    `TestimonialItem` sub-component per array row (Rules of Hooks), each wiring
    `useEditableField` on `quote` (`multiline: true`) and `author`, rendering
    `avatar` (when `isDoc<Media>`) via `<MediaImage image={...} size="thumbnail"
    imgClassName="rounded-full" />`. Top level: optional heading using the same
    `isEditable`-widened conditional every other block uses, then a responsive grid
    (reuse the `COLUMNS` 2/3/4 class map pattern) of items inside `<Section
    blockId={id} surface={surface}><Container className="ui-section-container">`.
    No `'use client'` (see Notes for the AI).
  - Register `Testimonials` config + component in `src/blocks/registry.ts`
    (`rawBlockConfigs`, `blockComponents['testimonials']`).
  - Done when: "Testimonials" appears in the Pages block picker; a block with 2+
    items (at least one with an avatar, one without) renders correctly in the dev
    server with a circular avatar where present; `npm run lint` and `npm run
    generate:types` complete with no errors.

- [x] 2. **Logo Cloud block**
  - `src/blocks/LogoCloud/config.ts` — slug `logoCloud`, `interfaceName:
    'LogoCloudBlock'`. Content tab: optional `heading` (text,
    `field-label--sidebar-badge`); required `items` array (`minRows: 1`, labels
    Logo/Logos, same className) with a single required `logo` (upload → `media`).
    Layout tab: `...appearanceField(undefined, 'field-label--sidebar-badge')` only —
    no `columns` field.
  - Run `npm run generate:types` so `LogoCloudBlock` exists before writing the
    component.
  - `src/blocks/LogoCloud/Component.tsx` — no per-item text field, so no
    `useEditableField`/per-item sub-component is needed (only the heading uses it).
    Render the optional heading, then every item's `logo` (guarded by
    `isDoc<Media>`) via `<MediaImage image={...} size="thumbnail" />` inside
    `<Stack direction="row" gap="lg" wrap align="center">`, itself inside the usual
    `<Section blockId={id} surface={surface}><Container
    className="ui-section-container">`.
  - Register `LogoCloud` config + component in `src/blocks/registry.ts`
    (`rawBlockConfigs`, `blockComponents['logoCloud']`).
  - Done when: "Logo Cloud" appears in the Pages block picker; a block with 3+
    uploaded logos renders as a wrapping row in the dev server; `npm run lint` and
    `npm run generate:types` complete with no errors.

## Files / areas

- `src/blocks/Testimonials/config.ts` (new)
- `src/blocks/Testimonials/Component.tsx` (new)
- `src/blocks/LogoCloud/config.ts` (new)
- `src/blocks/LogoCloud/Component.tsx` (new)
- `src/blocks/registry.ts` (edit: add both configs/components)
- `src/payload-types.ts` (regenerated by `npm run generate:types`, not hand-edited)
- Reused, unmodified: `src/fields/appearance.ts` (`appearanceField`),
  `src/fields/editAccordion.ts` (applied automatically by the registry),
  `src/utilities/useEditableField.ts`, `src/components/MediaImage.tsx`,
  `src/utilities/isDoc.ts`, `src/components/primitives/*` (Section/Container/Stack/
  Heading)

## Data / contracts

- `TestimonialsBlock`: `{ id, blockType: 'testimonials', surface?, columns?:
  '2'|'3'|'4', heading?: string, items: { id?, quote: string, author: string,
  avatar?: Media | string | null }[] }`. `quote`/`author` required per row
  (`minRows: 1` enforced by Payload); `avatar` optional.
- `LogoCloudBlock`: `{ id, blockType: 'logoCloud', surface?, heading?: string, items:
  { id?, logo: Media | string }[] }`. `logo` required per row — a row with no logo
  is not a valid entry.
- Both slugs (`testimonials`, `logoCloud`) are additive entries in `blockSlugs`; no
  existing `Pages`/`Posts` documents reference them, so no migration or backfill is
  needed.
- `avatar`/`logo` reuse the existing `Media` collection's generated sizes and its
  already-required `alt` field — no new upload validation.

## Testing

No dedicated unit test file. Like `FeatureGrid`/`Stats`, both blocks have no
non-trivial pure logic (no derived state, no toggle) — only static per-item
rendering — so there's nothing a unit test would exercise beyond what `npm run
lint`, `npm run generate:types`, and manual dev-server verification already cover.
The existing generic block-sync tests (`tests/int/blockRowLookup.int.spec.ts`,
`tests/int/blockSyncMessages.int.spec.ts`) are not block-slug-specific and need no
changes.

## Notes for the AI

- Follow `Stats`/`Accordion`'s config shape (Content/Layout tabs,
  `field-label--sidebar-badge` on every non-checkbox field, no custom `RowLabel`) —
  not `FeatureGrid`/`Hero`'s customized `RowLabel` — since neither new block has an
  obvious single "title" field a custom label would read from.
- Logo Cloud deliberately has no `columns` select: a "logo cloud" is conventionally
  an auto-wrapping row, not a fixed grid, and the build-plan's "logo grid" wording is
  descriptive, not a literal grid-template-columns requirement. This is a reversible
  visual choice with no stored-data or contract impact.
- Circular avatars have no existing token (`MediaImage`'s `radius` prop only has
  `none`/`sm`/`site`/`lg`); use its `imgClassName` escape hatch
  (`imgClassName="rounded-full"`) rather than adding a new radius variant —
  Testimonials is the only caller that needs it.
- Neither block needs `'use client'`: like `FeatureGrid`/`Stats`/`Hero`/
  `CallToAction`, they only reach hooks through `useEditableField`, which carries its
  own directive. See `Accordion/Component.tsx`'s comment for when a block *does* need
  it — only when calling React hooks directly (e.g. `useState`), which neither new
  block does.
- `editAccordionField` and the `data-block-id` hover-sync marker are applied
  automatically (`registry.ts`, `Section`'s `blockId` prop) — do not wire either by
  hand.
- Run `npm run generate:types` right after each block's `config.ts` is written and
  before writing its `Component.tsx` — the component imports the freshly generated
  `TestimonialsBlock`/`LogoCloudBlock` type.
