# Current Feature

## Narrower Site Settings tabs (horizontal), plus a narrower admin nav

**Type:** Fix
**Status:** verified
**Branch:** `fix/settings-tabs-left-sidebar`

## The problem

The Site Settings global (`src/globals/Settings/config.ts`) groups its fields
under a `type: 'tabs'` field with four tabs: Information, Corners, Shadows,
Colors. Payload's default tabs field renders horizontal tabs
across the top, with the active tab's fields stretching the full remaining
page width below - which felt too wide.

The admin panel's main left navigation should also be narrower than
Payload's default.

## The fix

Keep Payload's default horizontal tab row (tabs across the top, unchanged
behavior/conditions/error states), but constrain the whole tabs field to a
single narrow column (~640px) instead of stretching full-bleed. Scoped so it
never affects the `type: 'tabs'` fields already used on `Posts` and `Pages`.
Separately, narrow Payload's own main left nav (admin-wide, not just Site
Settings).

Approach:

1. In `src/globals/Settings/config.ts`, add `admin: { className: 'settings-tabs' }`
   to the top-level `tabs` field - the only config change, just a scoping
   hook for the CSS below.
2. In `src/app/(payload)/custom.scss` (already imported globally by
   `src/app/(payload)/layout.tsx`), scope one rule under `.settings-tabs`:
   `max-width: 640px` above Payload's small/mid breakpoints (`min-width: 769px`),
   leaving every other tabs-field style (horizontal tab row, active-tab
   underline, overflow-x scrolling for the tab strip) as Payload's default.
3. In the same `custom.scss`, override Payload's `--nav-width` custom
   property (default `275px`) to `178.75px` (35% narrower) at `:root`, gated
   to `min-width: 769px` so Payload's own mobile behavior
   (`--nav-width: 100vw` below 768px) is untouched. This is intentionally
   global and independent of the Settings tabs width above.
4. No new custom component, so no importmap regeneration is needed.

**Must not break:** the Posts and Pages edit views' existing horizontal tabs,
tab conditions/error highlighting, and light/dark theming.

### Follow-up: give Live Preview more room, keep the 640px field fixed

Intent (per user correction): the 640px cap on the Settings field should
always hold, including during Live Preview - the point of capping it was to
free up room for the live-preview iframe to be bigger, not to leave blank
space next to a shrunk fields column.

Payload's default Live Preview layout doesn't actually connect those two
things: `.live-preview-window` has a fixed `width: 60%` (`flex-shrink: 0;
flex-grow: 0`), and its sibling `.collection-edit__main` (holding the fields)
flex-shrinks to fill whatever's left (~40%) - regardless of how much width
the fields inside it actually need. So capping the field at 640px never
changed the iframe's size; it just left dead space inside the already-~40%
left column. (An earlier version of this step tried dropping the 640px cap
during Live Preview instead - reverted per user feedback; the cap must hold
always.)

Fix: pin the fields column to a fixed width that comfortably fits the
640px-capped field, and let the iframe grow to fill everything else instead
of being capped at a fixed 60%.

- Payload's edit view puts a `global-edit--settings` class and, only while
  live-previewing via an iframe, a `collection-edit--is-live-previewing`
  class on the document edit view's root element - both confirmed from
  `@payloadcms/ui`'s `Edit` view source. Combined
  (`.global-edit--settings.collection-edit--is-live-previewing`) this scopes
  cleanly to just this one state on this one global, no new marker needed.
- Under that scope (and above Payload's own 1024px mid-break, where the
  iframe stops sitting beside the fields and stacks below instead):
  - `.collection-edit__main` (the fields column): `flex: 0 0 700px; width: 700px`
    (700px comfortably fits the 640px field plus its gutters) instead of
    Payload's flex-shrink-to-~40% default.
  - `.document-fields__edit`'s right-side gutter (Payload's own padding
    between the fields and the iframe): `var(--base)` (~25px) instead of the
    default `var(--gutter-h)` (~60px).
  - `.live-preview-window` (the iframe): `flex: 1 1 auto; width: auto`
    instead of the fixed `width: 60%`, so it grows to fill whatever space
    the now fixed-width fields column doesn't use.

### Follow-up: shorter tab labels

Renamed two tab labels in `src/globals/Settings/config.ts` for brevity in
the now-narrower tab row: "Corner Radius" -> "Corners", "Site Colors" ->
"Colors". Label-only change; the fields inside those tabs, their `name`s,
and `payload-types.ts` are unaffected (tab `label` isn't part of the
generated types).

### History on this branch

The Settings tabs were first restyled as a vertical left-sidebar nav (tab
labels stacked, own column), then reverted to Payload's stock horizontal
layout, then that vertical-sidebar version was restored, then finally
replaced with this version: horizontal tabs kept, only the overall field
width narrowed (400px, then widened to 640px). The admin nav width was tried
at 50% narrower first, then revised to 35% narrower, and was not affected by
any of the tabs iterations. The Live Preview gap fix above is additive on
top of the 640px version.

## Build steps

- [x] Add the `admin.className` to the Settings tabs field; scope
   `.settings-tabs { max-width: 640px }` (desktop only) in `custom.scss`.
   **Done when:** on `/admin/globals/settings`, the tabs render horizontally
   across the top (unchanged from Payload default) but the whole field is a
   narrow ~640px column instead of full page width, and
   `/admin/collections/posts/<id>` / `/admin/collections/pages/<id>` still
   show their tabs in the original full-width horizontal layout.
- [x] Override `--nav-width` to `178.75px` (desktop only, 35% narrower than
   the original 275px) in `custom.scss`.
   **Done when:** the main admin left nav (visible on every collection/global
   page) renders about 35% narrower than its original width, nav items are
   still legible, and the nav still expands to full width on a narrow/mobile
   viewport.
- [x] Scope a Live-Preview-only override to `/admin/globals/settings`: fix
   the fields column at 700px (keeping the field itself capped at 640px) and
   let the live-preview iframe grow to fill the rest, instead of the
   iframe's fixed 60%.
   **Done when:** with Live Preview toggled on for Site Settings above a
   1025px-wide viewport, the fields column stays a fixed ~700px (field still
   reads at 640px) and the live-preview iframe visibly takes up more than
   its old fixed 60% on wide viewports; toggling Live Preview off (or
   viewing Posts/Pages with Live Preview on) shows no change from before
   this step.
- [x] Rename tab labels: "Corner Radius" -> "Corners", "Site Colors" ->
   "Colors" in `src/globals/Settings/config.ts`.
   **Done when:** `/admin/globals/settings` shows the four tabs as
   Information / Corners / Shadows / Colors.

## Verify

- Open `/admin/globals/settings` in the browser (`npm run dev`): confirm the
  tabs are a horizontal row (Information / Corners / Shadows / Colors) and
  the whole field (tabs + fields) sits in a narrow ~640px column, not full
  page width.
- Resize the browser to a narrow/mobile width and confirm the field remains
  usable (Payload's own responsive tab/field behavior still applies).
- Toggle light/dark theme and confirm the tabs and fields remain legible.
- Open a Post or Page edit view and confirm their tabs are unchanged
  (full-width, horizontal, as before).
- Confirm the main left nav is about 35% narrower (275px -> ~179px) on every
  admin page, nav item labels are still readable, and it still expands to
  full width on a narrow/mobile viewport.
- On `/admin/globals/settings`, toggle Live Preview on (viewport wider than
  1025px): confirm the fields column holds at its fixed width (field content
  still reads at 640px, not stretched or shrunk), the live-preview iframe
  visibly fills the extra room instead of stopping at a fixed 60%, fields
  are still fully readable, and the iframe still updates live as fields
  change.
- Open a Post or Page with Live Preview on and confirm that layout is
  unchanged from Payload's default (this fix is scoped to Site Settings
  only).
