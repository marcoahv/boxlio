# Current Feature

## Title

Add tabs to Site Settings: "Information" and "Corner Radius"

**Type:** Fix
**Status:** verified
**Branch:** `fix/site-settings-tabs`

## The problem

`src/globals/Settings/config.ts` lists every field flat. The two corner-radius
selects (`imageRadius`, `buttonRadius`) sit in the main panel with no grouping,
while `siteName`, `siteDescription`, `gtmCode`, `icon`, and `iconDark` are
pinned to the sidebar via `admin.position: 'sidebar'`. As more settings get
added this flat layout gets harder to scan, and there's no place to group
general site info separately from the appearance controls.

## The fix

Wrap the field list in a top-level `tabs` field with two tabs:

- **Information** - `siteName`, `siteDescription`, `gtmCode`, `icon`, `iconDark`
  (in that order). Drop `admin.position: 'sidebar'` from each so they render in
  the tab body instead of the sidebar — Payload tabs live in the main panel, so
  keeping the sidebar position would leave this tab empty.
- **Corner Radius** - `imageRadius`, `buttonRadius`, unchanged otherwise.

Nothing about field names, types, options, defaults, validation, or hooks
changes — this is purely a layout/grouping change inside `fields`. The
`afterChange: [revalidateGlobal]` hook and the `slug`/`label` on the global
stay as-is.

Must not break:

- Existing saved values in the `settings` global (no field renames, so no data
  migration needed).
- The admin import map / generated types — `npm run generate:types` should be
  re-run after the edit since the field tree shape changes, but no new field
  `name`s are introduced so the generated `Settings` type shouldn't change.
- Any place in the app that renders these fields' values (`siteName`,
  `imageRadius`, etc. read via the global, not via admin layout), so the
  public site is unaffected.

## Build steps

1. [x] Edit `src/globals/Settings/config.ts`: restructure `fields` into a single
   `{ type: 'tabs', tabs: [...] }` entry with an "Information" tab (siteName,
   siteDescription, gtmCode, icon, iconDark — each with `admin.position`
   removed) and a "Corner Radius" tab (imageRadius, buttonRadius, unchanged).
   Done when the file has no more top-level sidebar-positioned fields and both
   tabs are present with their fields in the order above.

## Verify

- `npm run dev`, open `/admin/globals/settings`.
- Confirm two tabs render: "Information" and "Corner Radius".
- "Information" tab shows Site Name, Site Description, Google Tag Manager,
  Site Icon, Site Icon (dark mode) — all editable, no sidebar duplicates.
- "Corner Radius" tab shows Image Corner Radius and Button Corner Radius.
- Existing values (e.g. current `siteName`, `imageRadius`) still show
  correctly after the change — no data loss.
- Save the global and confirm it persists without error.
