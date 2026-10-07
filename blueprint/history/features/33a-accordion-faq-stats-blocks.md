# Current Feature

**Feature:** 33a. Accordion/FAQ + Stats blocks
**Branch:** `feature/accordion-faq-stats`
**Status:** verified (automated gate passed; the live admin/preview behavior in
each step's Done when still needs a manual pass against a running dev server)

## Goal

Add two text-only blocks to the shared page-builder registry — an
**Accordion/FAQ** and a **Stats** block — so editors can build FAQ sections and
metric rows without a developer. Both follow the registry contract already
locked in by features 27/28/29a/31, so they behave like every shipped block:
Content/Layout admin tabs, shared appearance controls, the automatic "Edit"
accordion, the hover-sync marker, and click-to-edit text in the Live Preview
iframe.

The Accordion is the first registry block with its own visitor-facing
interactive state, so it also establishes how an interactive block coexists
with inline editing.

## In scope

- `Accordion` block (`slug: 'accordion'`): optional `heading`, required
  `items` array of `question` + `answer`, editor-controlled
  "allow multiple open at once".
- `Stats` block (`slug: 'stats'`): optional `heading`, required `items` array
  of `value` + `label`, editor-controlled column count.
- Both registered in `src/blocks/registry.ts` (config + component), which is
  what makes them available in `Pages.blocks` and embeddable in `Posts.body`.
- Shared `appearanceField()` on each block's Layout tab. Corrected during
  implementation: it now returns **only** `surface` - `width`/`spacing` moved to
  the `Settings` global, so neither block has its own spacing or width control.
- Feature 31's admin organization: Content/Layout tabs, and
  `field-label--sidebar-badge` on radio/select/text/array fields. Checkboxes
  stay exempt, matching Hero's `videoLoop` exemption and Table's
  `hasHeaderRow`.
- Inline live-preview editing (29a convention) for every plain text field:
  `heading`, `items.N.question`, `items.N.answer`, `items.N.value`,
  `items.N.label`.
- Accessible accordion semantics and a pure, unit-tested open-state helper.
- Open/close animation on the Accordion panel and chevron, honouring
  `prefers-reduced-motion` (added as a change request after step 3; step 4).
- Regenerated `src/payload-types.ts`.

## Out of scope

- The rest of feature 33: Testimonials, Logo Cloud (33b), Carousel (33c).
- Rich text answers in the Accordion — `answer` is plain multiline text, so it
  stays inside the 29a inline-editing convention rather than needing 30a's
  Lexical toolbar. See Open questions.
- Icons or images on either block's items. Both blocks are text-only in this
  slice; `MediaImage` wiring arrives with 33b.
- A third optional description line on Stats items.
- Extracting FeatureGrid's `COLUMNS` class map into a shared helper. Stats gets
  its own local literal map; refactoring a shipped block is not part of this
  feature.
- Any change to `src/blocks/index.tsx`, the block dispatcher. Both blocks work
  through it unchanged.
- Playwright coverage. The `tests/e2e/` harness exists
  (`tests/e2e/theme-toggle.spec.ts`), but asserting accordion toggling in a
  browser needs a seeded Page document carrying an Accordion block, and no
  content-seeding fixture exists. Toggle behavior is covered by a unit test on
  the pure helper plus the manual check in each step's Done when.
- New access control, API routes, or collection changes. These are blocks on an
  existing collection, gated by the existing `Users` auth on `Pages`.

## Build loop

`workflow.stepReview` is `feature` and `checkpointCommits` is `disabled`, so:
implement all three steps in sequence without stopping for per-step approval,
then present **one** review packet covering the whole feature. No checkpoint
commits during the work; `/complete` creates the single feature commit.

There is no declared project `Verify` command (see `AGENTS.md` — `/ci` has not
run). The gate for this feature is, from the project root:

```
npm run generate:types
npm run lint
npm run test:int
npm run build
```

Run `generate:types` before `lint`/`build` on any step that changes a block
config, because the components import their props from `@/payload-types`.
`npm run generate:importmap` is **not** needed — this feature adds no custom
admin components.

## Build steps

- [x] **1. Accordion block: config, render, toggle, and open-state helper.**
  Add `src/blocks/Accordion/config.ts`, `src/blocks/Accordion/Component.tsx`,
  and `src/blocks/Accordion/openState.ts`, then register both the config and
  the component in `src/blocks/registry.ts`. The helper is a pure function
  (`toggleOpen(openIds, id, allowMultiple)`) returning the next open-id set;
  the component holds it in `useState`. Add
  `tests/int/accordionOpenState.int.spec.ts` covering: opening with
  `allowMultiple: false` replaces the previous item, opening with
  `allowMultiple: true` adds to it, and re-clicking an open item closes it in
  both modes. Guard `if (!items?.length) return null`, matching FeatureGrid.

  *Done when:* `npm run generate:types` emits `AccordionBlock`; "Accordion"
  appears in a Page's Layout → `blocks` picker with its fields inside the
  nested "Edit" accordion and split across Content/Layout tabs; adding one with
  two items and saving renders the questions on the published page; clicking a
  question expands its answer and collapses it again; with "Allow multiple open
  at once" off, opening a second item closes the first, and with it on both
  stay open; the rendered block carries `data-block-id` and hovering its admin
  row highlights it in Live Preview; `npm run test:int` passes including the new
  spec; `npm run lint` and `npm run build` pass.

- [x] **2. Accordion inline editing and its editable-mode header.**
  Wire `useEditableField` for `heading`, `items.N.question`, and
  `items.N.answer`, following `FeatureGrid/Component.tsx` exactly: a separate
  `AccordionItem` child component so each item's hooks are called at its own
  top level (Rules of Hooks), with `multiline: true` and
  `whitespace-pre-wrap` on `answer`.

  Resolve the two collisions between toggling and editing:
  - **Click conflict.** In normal rendering the item header is a `<button>`
    (correct accordion semantics). When `isEditable` is true, render the header
    as a `<div>` holding the question text as the inline-edit target plus a
    dedicated adjacent toggle `<button>`, so clicking the question starts an
    edit instead of collapsing the panel. Confirm `useEditableField`'s actual
    event contract in `src/utilities/useEditableField.ts` before wiring, rather
    than assuming it stops propagation.
  - **Hidden answers.** A collapsed panel's `answer` is not reachable for
    editing, so when `isEditable` is true every item starts expanded.

  *Done when:* in the admin Live Preview pane, clicking an Accordion heading,
  question, or answer edits it in place and the matching admin form field
  updates as you type, leaving the document dirty so the existing
  unsaved-changes/Save flow picks it up; clicking a question in preview does
  **not** collapse its panel; all panels start open in preview; the dedicated
  toggle button still expands/collapses there; on the published page (not
  preview) the header is a real `<button>` and nothing is editable;
  `npm run lint`, `npm run test:int`, and `npm run build` pass.

- [x] **3. Stats block.**
  Add `src/blocks/Stats/config.ts` and `src/blocks/Stats/Component.tsx`, and
  register both in `src/blocks/registry.ts`. No interactivity, so inline
  editing lands in this one step: `useEditableField` for `heading`,
  `items.N.value`, and `items.N.label`, with a `StatItem` child component for
  the per-item hooks. Use a local literal `COLUMNS` class map (Tailwind's
  scanner cannot resolve interpolated class names — see the comment in
  `FeatureGrid/Component.tsx`). Guard `if (!items?.length) return null`.

  *Done when:* `npm run generate:types` emits `StatsBlock`; "Stats" appears in
  the Layout → `blocks` picker with Content/Layout tabs and the Edit accordion;
  a Stats block with four items renders as a row of value/label pairs;
  switching `columns` between 2, 3, and 4 visibly changes the grid at desktop
  width and stays single-column on mobile; each `value` and `label` is
  click-to-edit in Live Preview and writes back to the admin form; the block
  carries `data-block-id` and hover-sync highlights it; `npm run lint`,
  `npm run test:int`, and `npm run build` all pass.

- [x] **4. Accordion open/close animation.** *(Added as a change request
  after step 3.)* Animate the panel and the chevron instead of hard-swapping
  them. Add `src/blocks/Accordion/_accordion.css` and import it from
  `src/app/(frontend)/styles/index.css` beside the other block CSS - that file
  is the one place that has to know where each colocated stylesheet lives.

  The panel animates `grid-template-rows` from `0fr` to `1fr`, not a
  max-height guess: the row resolves to the content's own height, so an answer
  of any length opens to exactly the right size with no magic number and no
  clipping. This replaces the `hidden` attribute with `visibility`, which
  preserves the a11y contract (out of the accessibility tree and out of tab
  order) while being animatable. Requires an inner wrapper that is allowed to
  shrink below its content height, and the panel's padding moves onto it -
  padding is unaffected by row size, so a collapsed panel would otherwise keep
  a visible strip. One `--ui-accordion-duration` custom property on
  `.ui-accordion-item` drives both animations and the visibility delay, so the
  `prefers-reduced-motion` override is a single declaration. Establishes the
  project's first reduced-motion handling; there was no prior precedent.

  *Done when:* opening an item slides its answer to full height and rotates
  the chevron, collapsing reverses it, and the answer does not blink out
  mid-collapse; a long answer is never clipped; a collapsed panel is
  unreachable by keyboard; with "Reduce motion" enabled in the OS the panels
  open and close instantly with no animation; `npm run lint`,
  `npm run test:int` and `npm run build` pass.

## Files / areas

New:

- `src/blocks/Accordion/config.ts`
- `src/blocks/Accordion/Component.tsx`
- `src/blocks/Accordion/openState.ts`
- `src/blocks/Accordion/_accordion.css`
- `src/blocks/Stats/config.ts`
- `src/blocks/Stats/Component.tsx`
- `tests/int/accordionOpenState.int.spec.ts`

Changed:

- `src/blocks/registry.ts` — two config imports added to `rawBlockConfigs`, two
  component imports added to `blockComponents`. Both are required: a config
  without a component renders null with only a dev-mode console warning.
- `src/payload-types.ts` — regenerated, not hand-edited.
- `src/app/(frontend)/styles/index.css` — one `@import` for the new block
  stylesheet, beside the existing `_table.css` / `_hero.css` imports.

Read-only references (do not modify):

- `src/blocks/FeatureGrid/Component.tsx` — the array-block + inline-editing
  template to copy.
- `src/blocks/Table/config.ts` — the Content/Layout tabs +
  `field-label--sidebar-badge` + `appearanceField(undefined, ...)` template.
- `src/fields/appearance.ts`, `src/utilities/useEditableField.ts`,
  `src/components/primitives` (`Section`, `Container`, `Stack`, `Heading`).

## Data / contracts

Both blocks are embedded documents inside `Pages.blocks` (and embeddable in
`Posts.body`). No new collection, global, route, or access rule.

**Accordion** — `slug: 'accordion'`, `interfaceName: 'AccordionBlock'`,
`labels: { singular: 'Accordion', plural: 'Accordions' }`.

- Content tab:
  - `heading` — `text`, optional.
  - `items` — `array`, `required: true`, `minRows: 1`,
    `labels: { singular: 'Item', plural: 'Items' }`:
    - `question` — `text`, `required: true`.
    - `answer` — `textarea`, `required: true`.
- Layout tab:
  - `...appearanceField(undefined, 'field-label--sidebar-badge')`.
  - `allowMultiple` — `checkbox`, `defaultValue: false`, label
    "Allow multiple open at once", with an `admin.description`. No
    `className` (checkboxes are exempt from the sidebar-badge style).

**Stats** — `slug: 'stats'`, `interfaceName: 'StatsBlock'`,
`labels: { singular: 'Stats', plural: 'Stats' }`.

- Content tab:
  - `heading` — `text`, optional.
  - `items` — `array`, `required: true`, `minRows: 1`, `maxRows: 8`,
    `labels: { singular: 'Stat', plural: 'Stats' }`:
    - `value` — `text`, `required: true`. **Text, not number**, so
      `"10k+"`, `"99.9%"`, and `"$2M"` are all representable.
    - `label` — `text`, `required: true`.
- Layout tab:
  - `...appearanceField(undefined, 'field-label--sidebar-badge')`.
  - `columns` — `select`, options `2`/`3`/`4` (string values, matching
    FeatureGrid), `defaultValue: '4'`.

Rendering contract for both:

- Root element is `<Section blockId={id} surface={surface}>` wrapping
  `<Container className="ui-section-container">`, mirroring
  `FeatureGrid/Component.tsx`. `Section` publishes `data-block-id` itself —
  do not add a wrapper element around it, per the note in
  `src/blocks/index.tsx`.
- Confirm against `Hero`/`Table`'s components whether `spacing` and `width`
  need to be passed explicitly or are consumed by `Section`/`Container`;
  FeatureGrid forwards only `surface`.
- All four text fields render as plain React children, so they are escaped by
  default. No `dangerouslySetInnerHTML` anywhere in this feature. `answer`
  renders with `whitespace-pre-wrap` to preserve editor line breaks.

Accordion accessibility contract:

- Each header control gets `aria-expanded` and `aria-controls` pointing at its
  panel's `id`; each panel gets `role="region"` and `aria-labelledby` pointing
  back at the header's `id`.
- Those ids must be **unique per block instance**, derived from the block's
  `id` plus the item's `id ?? index` — two Accordion blocks on one page must
  not collide.
- Collapsed panels are removed from the accessibility tree, not merely
  visually hidden. Implemented with `visibility: hidden` (which also removes
  them from tab order) rather than the `hidden` attribute, because step 4's
  animation needs a transitionable property - `display: none` cannot animate.
  The panel is never unmounted.

## Testing

- `npm run test:int` (Vitest, jsdom, `tests/int/**/*.int.spec.ts`).
- New: `tests/int/accordionOpenState.int.spec.ts` — pure-function tests for
  `toggleOpen` in both `allowMultiple` modes, including closing an already-open
  item. Matches the existing convention of testing extracted pure logic
  (`tests/int/pagination.int.spec.ts`, `tests/int/blockRowLookup.int.spec.ts`).
- No new Playwright spec, for the reason given in Out of scope.
- Visual, Live Preview, and inline-editing behavior are verified manually
  against the running dev server per each step's Done when. Do not record them
  as automated results.

## Notes for the AI

- `src/blocks/registry.ts` is a locked contract: a new block is added **only**
  by appending its config to `rawBlockConfigs` and its component to
  `blockComponents`. Everything else (the Edit accordion wrap, `blockSlugs`,
  the dispatcher, the rich-text converters, `payload.config.ts`'s top-level
  `blocks`) derives from those two. Do not touch the derived sites.
- ~~Block components are already inside a client boundary, so the Accordion can
  use `useState` without a `'use client'` directive.~~ **Wrong — corrected
  during implementation.** `<Blocks>` is indeed rendered only from
  `PageClient.tsx` / `BlogPageClient.tsx`, but `registry.ts` is *also* pulled
  into a Server Component graph through `payload.config.ts` →
  `getPayloadClient` → `getGlobals` → `layout.tsx`. Shipped blocks get away
  with hooks because they only ever reach them **through**
  `useEditableField`, which carries its own `'use client'`. Importing
  `useState`/`useId` straight from `react` fails the build with "You're
  importing a module that depends on `useState` into a React Server Component
  module". `src/blocks/Accordion/Component.tsx` therefore carries a
  `'use client'` directive, with a comment saying why. Any future block with
  its own React state needs the same; a block that only uses
  `useEditableField` does not.
- Per-item hooks go in a child component (`AccordionItem`, `StatItem`), never
  inline in a `.map()`. `FeatureGrid`'s `FeatureItem` documents exactly why.
- **How "expanded while editing" is actually implemented.** The behavior is as
  specified, but not via an effect that expands on activation — eslint's
  `react-hooks/set-state-in-effect` rejects that, correctly. Instead one state
  array changes meaning with the mode: in normal rendering it holds the **open**
  ids (default empty = all collapsed), and while editing it holds the
  **collapsed** ids (default empty = all expanded). Both modes start from the
  same empty array, so nothing has to be resynchronised when inline editing
  turns on mid-session, and because the state never derives from `items`, a
  live-preview keystroke cannot reopen a panel the editor deliberately
  collapsed. `toggleOpen` is called with `allowMultiple` forced true while
  editing, since a single-open reading aid has no meaning over a set of
  deliberate collapses.
- `fieldPath` for nested array fields is relative to the block, e.g.
  `items.0.question` — the convention `FeatureGrid`'s `features.N.title`
  establishes and 29d reused. Do not invent an absolute path.
- Editors pick semantic roles, never colors or pixel values, at block level.
  Neither block gets a color or size field; site-wide styling stays on
  `Settings`.
- `AGENTS.md`'s Commands section claims no test files exist yet. That is stale —
  `tests/int/` holds fifteen specs and `tests/e2e/` one. Do not act on the
  stale sentence, and do not fix it inside this feature.

## Open questions

- **Accordion `answer` field type.** The spec commits to `textarea` (plain
  multiline text), because that keeps the field inside feature 29a's
  inline-editing convention — the same thing `FeatureGrid.features[].body`
  does — and avoids extending 30a's Lexical toolbar to an arbitrary rich text
  field nested in an array, which is a feature of its own. The cost is that FAQ
  answers cannot contain links, bold, or lists, which is a common real need.
  Switching to `richText` later is a stored-data change, so it is cheapest to
  decide now, before step 1. Implementation can proceed on `textarea` as
  specified if you are happy with plain-text answers.
