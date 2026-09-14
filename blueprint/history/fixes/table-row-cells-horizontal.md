# Current Feature

**Title:** Lay a Table block row's cells out horizontally in the admin editor
**Type:** Fix
**Status:** verified
**Branch:** `fix/table-row-cells-horizontal`

### The problem

`src/blocks/Table/config.ts` models a table as `rows` (array) -> `cells`
(array) -> `content` (richText). Payload's default admin `ArrayField` stacks
its rows vertically (`@payloadcms/ui`'s Array field styles set
`.array-field__draggable-rows { flex-direction: column }`), which is correct
for the outer `rows` array - each item really is a separate table row - but
the same vertical stacking also applies to the inner `cells` array. In the
editor, every cell of a row renders one below the other instead of side by
side like the columns they represent, so a 3- or 4-column row is a tall
scroll of stacked cell editors with no visual correspondence to the table
being built.

This is an admin-editing problem only. The frontend render
(`src/blocks/Table/Component.tsx`) already emits a plain `<table>` with real
`<tr>`/`<td>` elements, and `_table.css` has no rule forcing a non-table
`display` on them, so cells already sit horizontally on the published page.
No frontend change is needed.

### The fix

Give the `cells` field a companion stylesheet that switches just that
field's `.array-field__draggable-rows` from column to row layout, loaded
through a no-UI `afterInput` slot component rather than a `Field` override.
Scope the override narrowly via an `admin.className` added to the same
field, so no other array field in the project is affected (not the outer
`rows` array, not Header/Footer nav-link arrays, not FeatureGrid's cards
array).

**First attempt and why it changed:** a `Field` override that rendered
Payload's own `ArrayFieldComponent` (deep-imported from
`@payloadcms/ui/fields/Array`) crashed the admin with "Cannot destructure
property 'config' of useConfig(...) as it is undefined." That deep-import
path pulls in an unbundled copy of `@payloadcms/ui`'s `Config` provider
module, separate from the bundled copy Payload's admin app actually mounts
- a dual-module-instance hazard, so `useConfig()` inside the re-rendered
field reads a React context that was never provided. Re-rendering the field
at all was unnecessary for a CSS-only change, so the fix now uses the
lighter `afterInput` slot instead, which needs no Payload hooks and never
touches `ArrayFieldComponent`.

Follow the existing `src/custom/<kind>/Component.tsx` convention already used
for other admin field overrides (`.claude/rules/components.md`,
`blueprint/context/coding-standards.md` React section - see
`src/custom/error/Component.tsx#CheckboxError` and
`src/custom/label/Component.tsx#ArrayRowLabel` for the pattern):

- `src/custom/table/Component.tsx` - `'use client'`, exports
  `TableCellsStyle`, a component with no UI of its own (`() => null`) that
  imports `./cells-horizontal.css` as a side effect (mirrors how
  `@payloadcms/ui`'s own field components colocate their CSS).
- `src/custom/table/cells-horizontal.css` - un-layered rules (so they beat
  the package's `@layer payload-default` styles on specificity-independent
  cascade order) scoping to `.ui-table-cells-field`:
  - `.ui-table-cells-field > .array-field__draggable-rows` gets
    `flex-direction: row; flex-wrap: wrap` instead of the default column.
  - `.ui-table-cells-field > .array-field__draggable-rows > div` (the actual
    flex item) gets a flexible min-width (e.g. `flex: 1 1 220px; min-width:
    220px`) so cell drawers share the row and wrap onto a new line when the
    panel is too narrow.

**Second correction, found during manual verification:** the first version
of the CSS targeted `.array-field__draggable-rows > .array-field__row`
directly and had no visible effect - cells still stacked one per line.
`ArrayRow.js` wraps each row's `Collapsible` (the element that actually
carries the `array-field__row` class) in its own unclassed `<div>` for the
drag ref/transform, so that unclassed div - not `.array-field__row` - is the
real direct child of `.array-field__draggable-rows` and the real flex item.
A `flex`/`min-width` rule on `.array-field__row` itself does nothing because
it isn't a flex item; the selector had to move one level up to
`> div`.

Wire-up in `src/blocks/Table/config.ts`, on the `cells` field:

```ts
admin: {
  className: 'ui-table-cells-field',
  components: {
    afterInput: ['@/custom/table/Component.tsx#TableCellsStyle'],
  },
},
```

Must not break: the outer `rows` array (unaffected - the class only lands on
`cells`, so rows keep stacking one per line), every other array field in the
admin (Header/Footer nav links, FeatureGrid cards - different fields,
untouched), each cell drawer's existing controls (collapse, drag-to-reorder,
add/remove, richText editing - all still functional, just laid out
horizontally), and the frontend table render (no change to `Component.tsx`
or `_table.css`).

### Build steps

- [x] 1. Add `src/custom/table/Component.tsx` and
  `src/custom/table/cells-horizontal.css`; wire `admin.className` and
  `admin.components.Field` onto the `cells` field in
  `src/blocks/Table/config.ts`; run `npm run generate:importmap` to register
  the new component path.
  - Done when: opening a Table block with a header row and 3+ columns in the
    Payload admin shows each row's cell editors arranged side by side
    (wrapping to a new line if the row is too narrow), while the outer row
    list still stacks one row per line beneath it; every other array field in
    the admin (Header/Footer nav, FeatureGrid) is visually unchanged.

### Verify

- `npm run generate:importmap` runs clean and registers the new component.
- `npm run build` passes.
- In the admin, open a blog post's Table block: each row's `cells` array now
  lays its cell editors out horizontally instead of stacked; add/remove/
  reorder/collapse controls on a cell still work.
- The `rows` array itself still stacks one row per line, unchanged.
- Header/Footer nav-link arrays and FeatureGrid's cards array look and behave
  exactly as before.
- On the published blog page, a Table block's rendered `<table>` is visually
  unchanged - cells already sat horizontally there.
