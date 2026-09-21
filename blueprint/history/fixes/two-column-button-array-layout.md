# Two-column layout for the Button(s) array fields

**Type:** Fix

**Status:** verified

**Branch:** fix/two-column-button-array-layout

## The problem

The Hero block's `links` array field (admin label "Button(s)",
`src/blocks/Hero/config.ts`) renders its four sub-fields stacked one per row:
Label, Url, Variant, Color. The user wants them arranged as two columns per
row instead: Label/Url on one row, Variant/Color on the next.

- `src/blocks/Hero/config.ts` (lines 58-80) - the `links` array's `fields`
  array is a flat list of four sibling fields, each rendering full-width.

## The fix

Wrap the four sub-fields in two Payload `row`-type fields (the same pattern
already used in `src/collections/Pages/config.ts` and
`src/collections/Posts/config.ts`), so each pair renders side by side:

- Row 1: `label`, `url`
- Row 2: `variant`, `color`

Keep every existing field option (`name`, `type`, `required`, `defaultValue`,
`options`) exactly as-is - this only changes the grouping/wrapping, not field
behavior, validation, or stored data shape (a `row` field is layout-only and
does not appear in the data schema).

Must not break: the array's custom `RowLabel` component, `initCollapsed`,
`maxRows`, or the field-label CSS alignment comment referencing "Button(s)"
in the same file.

## Build steps

1. [x] In `src/blocks/Hero/config.ts`, replace the flat `label, url, variant,
   color` field list inside the `links` array with two `{ type: 'row', fields:
   [...] }` entries as described above.
   **Done when:** in the admin editor, an expanded Button row shows Label and
   Url side by side on one line, and Variant and Color side by side on the
   next line, with no change to validation, options, or defaults.

## Verify

In the Payload admin, open a Page with a Hero block, expand a Button row under
"Button(s)": Label and Url appear side by side; Variant and Color appear side
by side below them. Add/remove a button row and confirm the layout holds for
each row.
