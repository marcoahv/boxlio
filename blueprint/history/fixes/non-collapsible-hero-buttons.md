# Non-collapsible Hero Button(s) array rows

**Type:** Fix

**Status:** verified

**Branch:** fix/non-collapsible-hero-buttons

## The problem

The Hero block's `links` array field (admin label "Button(s)",
`src/blocks/Hero/config.ts:44-57`) renders each Button row as a Payload Array
row: a clickable header bar with a chevron that collapses/expands the row's
fields (Label/Url, Variant/Color), and `admin.initCollapsed: true` starts every
row collapsed. The user wants Button rows to never collapse - all fields
always visible, no toggle.

Payload's `ArrayField` admin config only exposes `initCollapsed` and
`isSortable` (`node_modules/payload/dist/fields/config/types.d.ts`) - there is
no field-level option to remove a row's collapse behavior. The underlying
`Collapsible` UI primitive (`@payloadcms/ui`) does support
`disableHeaderToggle` / `disableToggleIndicator` props, but the Array field's
row renderer (`ArrayRow.js`) never forwards a field-config value into them, so
this can't be switched off from `src/blocks/Hero/config.ts` alone.

## The fix

Scope a CSS override to just this array field, the same pattern this file
already uses for `field-label--match-array-label` (see
`src/app/(payload)/custom.scss`'s comment on that class):

1. In `src/blocks/Hero/config.ts`, on the `links` field's `admin` object:
   - Add `className: 'hero-buttons-array'`.
   - Change `initCollapsed: true` to `initCollapsed: false` (rows must start
     open now that they can no longer be toggled closed).
2. In `src/app/(payload)/custom.scss`, add a rule scoped to
   `.hero-buttons-array` that disables the row's toggle button
   (`.collapsible__toggle`, `pointer-events: none`), hides its chevron
   (`.collapsible__indicator`), and neutralizes the now-meaningless hover
   highlight on `.collapsible__toggle-wrap`.

Must not break: the row's `RowLabel` (fallback "Button 01"/"Button 02" text
must still render), the row actions (add/duplicate/move/remove via
`ArrayAction`, which live in `.collapsible__actions` and are unaffected by
this), `maxRows: 2`, and every other array/collapsible field elsewhere in the
admin (scoping to `.hero-buttons-array` keeps this off every other field,
including CallToAction's structurally-identical `links` array).

## Build steps

1. [x] Update `src/blocks/Hero/config.ts` (`admin.className` +
   `initCollapsed: false` on `links`) and add the scoped CSS rule to
   `src/app/(payload)/custom.scss`.
   **Done when:** in the admin editor, both Button rows under "Button(s)"
   render fully expanded with no working toggle - clicking the row header
   does nothing, no chevron is shown - while add/duplicate/move/remove still
   work normally.

## Verify

In the Payload admin, open a Page with a Hero block: both Button rows under
"Button(s)" show all four fields (Label, Url, Variant, Color) with no collapse
chevron, and clicking the row header doesn't close them. Add a second Button
row and confirm it also renders open with no toggle. Confirm a CallToAction
block's Link(s) array (same underlying fields) still collapses/expands
normally - unaffected by this change.
