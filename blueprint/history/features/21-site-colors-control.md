# Current Feature

**Title:** Site Colors control
**Type:** Feature (build-plan item 21)
**Status:** verified
**Branch:** `feature/site-colors-control`

## Goal

Let a site's content editors change the site's primary and secondary brand
colors, and their light/dark shades, from a new **Site Colors** tab on the
`Settings` global - no CSS edit required. Today those six colors
(`--color-primary`, `--color-primary-light`, `--color-primary-dark`,
`--color-secondary`, `--color-secondary-light`, `--color-secondary-dark`) are
hardcoded hex literals in `src/app/(frontend)/styles/base/_base-tokens.css`.
This feature makes them editor-controlled, following the exact same
field -> runtime CSS custom property pattern already shipped for corner
radius and shadows (`imageRadius`/`buttonRadius`/`imageShadow`/
`buttonShadow`/`cardShadow`).

Editors pick each color with a native browser color picker (confirmed
approach - see below), not a typed hex code, since this project has no
existing color-picker component and typing/copying hex values is worse UX
for a brand-new control.

## In scope

- A new **Site Colors** tab on `src/globals/Settings/config.ts`, after the
  existing Corner Radius/Shadows tabs, with six fields: `primaryColor`,
  `primaryColorLight`, `primaryColorDark`, `secondaryColor`,
  `secondaryColorLight`, `secondaryColorDark`.
- A reusable custom Payload Field component rendering a native
  `<input type="color">` bound to each field's stored hex value.
- Wiring the six stored values into the six existing CSS custom properties at
  runtime (SSR via an inline style on `<html>` in `layout.tsx`, kept in sync
  during live preview via `SettingsLivePreviewSync.tsx`), so every existing
  consumer (buttons, `ui-gradient-primary`, Hero's background-image overlay
  tints, the focus ring, the "Primary color"/"Secondary color" block
  surfaces) picks up the new value automatically, with no changes to those
  consumers.
- Defaulting all six fields to the project's current literal hex values, so
  an existing or freshly-cloned site renders identically until an editor
  changes something.
- Hex-format validation on save (defense against a malformed value reaching
  the stored field via direct API/GraphQL writes, since the native color
  input itself can only ever produce a valid 6-digit hex string).

## Out of scope

- Any new npm dependency (no `react-color` or similar) - the browser's
  native color input is sufficient and matches the approved approach.
- Derived/alias tokens computed from these six with `color-mix()` or
  `light-dark()` (e.g. `--color-on-overlay`, the neutral ramp, the
  red/blue/yellow/green feedback colors) - out of scope, unchanged.
- Per-block or per-document color overrides - this is a single site-wide
  palette, matching how radius/shadow already work.
- Any change to `Hero.overlayColor`'s four preset options (dark/light/
  primary/secondary) - it keeps resolving through the same tokens, which is
  the intended ripple effect, not new scope.
- Access control changes - `Settings` has no custom `access` block today
  (like `Header`/`Footer`); these six fields inherit the same admin-only
  write path as every other Settings field. Not touched.
- The Website-Personalities-Framework guide content (build-plan item 11) -
  unrelated to this feature.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement and verify each step below in
order without pausing for approval between them, keeping the project working
after every step, then stop and present one review packet with the complete
diff and each step's Done-when evidence before `/complete`. No checkpoint
commits.

## Build steps

- [x] 1. **Add the hex-color validator utility.** Create
  `src/utilities/color.ts` exporting `isHexColor(value: unknown): value is string`,
  matching a strict `#` + 6 lowercase-or-uppercase hex digits (e.g. `#d6c1a1`)
  - the exact format a native `<input type="color">` always produces - and
  rejecting short (`#fff`), unprefixed (`d6c1a1`), malformed, non-string, and
  empty values. Add `tests/int/color.int.spec.ts` mirroring
  `tests/int/theme.int.spec.ts`'s style (plain `describe`/`it` on the pure
  function, one case per accepted/rejected shape). Extended after initial
  review to also export `normalizeHex(raw: string): string` (adds a missing
  `#`, lowercases, trims) from the same file, with its own test cases - added
  to support step 2's pasteable hex text input.
  **Done when:** `npm run test:int` passes, including the new spec file.

- [x] 2. **Add the reusable color-picker Field component.** Create
  `src/custom/color/Component.tsx` exporting `ColorPickerField`, typed as a
  `TextFieldClientComponent` (from `payload`), using `useField<string>` (from
  `@payloadcms/ui`) for `value`/`setValue`/`showError`/`errorMessage`, and
  `FieldLabel`/`FieldDescription`/`FieldError` (from `@payloadcms/ui`) for the
  label, admin description, and validation error - matching the presentation
  every other Settings field already gets. Render a native
  `<input type="color" value={value ?? '#000000'} onChange={...}>`, sized
  `9.6rem` wide x `4.8rem` tall (revised twice after initial review: the
  browser default swatch read as a small wide rectangle, then a
  taller-than-wide `3.2rem` x `4.8rem` box, then 3x wider at the user's
  request) with `padding: 0` so the color fill reaches the box edges instead
  of leaving a thin default-padding border.

  Revised again after initial review to add a second, pasteable hex text
  input next to the picker (originally a read-only hex readout, at the
  user's explicit request to be able to paste a value instead of only
  picking one). The text input keeps its own local `text` state rather than
  binding directly to the field value, so a partial/invalid in-progress
  paste doesn't get committed - `onChange` always updates `text`, then calls
  `normalizeHex` (step 1) and only calls the field's `setValue` when the
  normalized result passes `isHexColor`. A `useEffect` re-syncs `text` from
  the field's value whenever it changes (from either input), so picking a
  color also updates the text field, and a committed paste is reflected back
  normalized.
  **Done when:** `npm run build` passes (the component is not yet referenced
  by any field, so it only needs to compile and typecheck cleanly at this
  step).

- [x] 3. **Add the Site Colors tab and its six fields** to
  `src/globals/Settings/config.ts`, as a new tab after "Shadows", laid out as
  two vertically-stacked groups of three fields each, each group wrapped in
  a labeled, always-expanded `type: 'collapsible'` ("Primary" / "Secondary",
  `admin.initCollapsed: false`) for a visible boundary between the two -
  the same collapsible-grouping pattern `appearanceField()` already uses for
  its own field trio, and confirmed not to nest field paths under the
  collapsible's label (revised twice after initial review: started as two
  3-across rows, then a flat vertical list with no visual grouping, then
  this):
  - Group 1 (Primary): `primaryColor` ("Primary Color", default `#d6c1a1`),
    `primaryColorLight` ("Primary Color (Light)", default `#e2dbcf`),
    `primaryColorDark` ("Primary Color (Dark)", default `#b2905c`)
  - Group 2 (Secondary): `secondaryColor` ("Secondary Color", default
    `#49b7d2`), `secondaryColorLight` ("Secondary Color (Light)", default
    `#9fd0dc`), `secondaryColorDark` ("Secondary Color (Dark)", default
    `#137c95`)

  Each field is `type: 'text'`, `admin.components.Field` pointing at
  `@/custom/color/Component.tsx#ColorPickerField`, and `validate` calling
  `isHexColor` from step 1, returning `'Enter a valid hex color (e.g.
  #d6c1a1).'` when it fails. Then run `npm run generate:types` and
  `npm run generate:importmap`.
  **Done when:** `npm run build` passes, `src/payload-types.ts`'s `Setting`
  type includes all six new fields as `string`, and the generated import map
  contains no missing-component warning for the new path.

- [x] 4. **Wire the six fields into their CSS custom properties at render
  time**, in `src/app/(frontend)/layout.tsx`. Add a `style` prop to the
  `<html>` element alongside the existing `data-*-radius`/`data-*-shadow`
  attributes:
  `style={{ '--color-primary': settings.primaryColor ?? '#d6c1a1', '--color-primary-light': settings.primaryColorLight ?? '#e2dbcf', '--color-primary-dark': settings.primaryColorDark ?? '#b2905c', '--color-secondary': settings.secondaryColor ?? '#49b7d2', '--color-secondary-light': settings.secondaryColorLight ?? '#9fd0dc', '--color-secondary-dark': settings.secondaryColorDark ?? '#137c95' }}`.
  An inline style on `<html>` overrides the `:root { --color-primary: ...; }`
  declaration in `_base-tokens.css` (same element, higher specificity), so no
  CSS file rule changes are needed for this step. Update the comment at
  `_base-tokens.css`'s Palette section (currently says these tokens are
  "meant to be overridden at runtime by the Theme global") to name the real
  mechanism: the `Settings` global's Site Colors tab, via `layout.tsx`'s
  inline style.
  **Done when:** `npm run build` passes; loading `/` and viewing page source
  shows the six custom properties on `<html>`'s `style` attribute with the
  Settings-stored values; changing a Site Colors value in `/admin` and saving
  changes the rendered color of a primary/secondary-dependent element
  (e.g. a Solid button, or a page block set to "Primary color"/"Secondary
  color" surface) after a refresh.

- [x] 5. **Sync the six fields during live preview**, in
  `src/globals/Settings/Component/SettingsLivePreviewSync.tsx`. Destructure
  the six new fields from the existing `useScopedLivePreview<Setting>` call,
  and add one `useEffect` per field calling
  `document.documentElement.style.setProperty('--color-primary', primaryColor ?? '#d6c1a1')`
  (and the same for the other five), matching the file's existing
  `setAttribute`-per-`useEffect` pattern for radius/shadow.
  **Done when:** `npm run build` passes; with Settings open in the admin's
  live preview pane, changing any Site Colors field updates the previewed
  page's colors instantly, with no save required.

## Files / areas

- `src/utilities/color.ts` - new
- `tests/int/color.int.spec.ts` - new
- `src/custom/color/Component.tsx` - new
- `src/globals/Settings/config.ts` - edit (new tab + six fields)
- `src/app/(frontend)/layout.tsx` - edit (inline `style` on `<html>`)
- `src/app/(frontend)/styles/base/_base-tokens.css` - edit (comment only, no
  literal value changes - the six defaults stay as the fallback/`defaultValue`
  source)
- `src/globals/Settings/Component/SettingsLivePreviewSync.tsx` - edit
- `src/payload-types.ts` - regenerated by `npm run generate:types`, not
  hand-edited
- `src/app/(payload)/admin/importMap.js` - regenerated by
  `npm run generate:importmap`, not hand-edited

## Data / contracts

- Six new `text` fields on the `settings` global, all optional (no
  `required: true`, matching `imageRadius`/`buttonRadius`/`*Shadow`
  precedent - a fresh document always gets a valid value from
  `defaultValue`, and every consumer falls back to the same default via `??`
  if a value is ever missing):
  | Field | Label | Default | CSS custom property |
  |---|---|---|---|
  | `primaryColor` | Primary Color | `#d6c1a1` | `--color-primary` |
  | `primaryColorLight` | Primary Color (Light) | `#e2dbcf` | `--color-primary-light` |
  | `primaryColorDark` | Primary Color (Dark) | `#b2905c` | `--color-primary-dark` |
  | `secondaryColor` | Secondary Color | `#49b7d2` | `--color-secondary` |
  | `secondaryColorLight` | Secondary Color (Light) | `#9fd0dc` | `--color-secondary-light` |
  | `secondaryColorDark` | Secondary Color (Dark) | `#137c95` | `--color-secondary-dark` |
- Stored format is always `#` followed by exactly 6 hex digits (matches what
  `<input type="color">` produces), enforced by `isHexColor` in the field's
  `validate`.
- No new API route, no new access-control rule - these fields ride the
  existing `settings` global's default Payload REST/GraphQL/Local API
  surface, same as every other Settings field.

## Testing

- Unit (Vitest, `npm run test:int`): `isHexColor` accepts/rejects the shapes
  listed in step 1; `normalizeHex` (added in the same file for step 2's paste
  input) prefixes/lowercases/trims correctly.
- No component or browser test - this repo has no admin-component or
  Next.js-SSR test harness today, and no sibling Settings control
  (`imageRadius`, `showThemeToggle`, etc.) has one either. Steps 3-5's
  Done-when instead names exact manual verification (`/admin` field
  behavior, page-source inspection, live preview) to run via `/try` after
  implementation.

## Notes for the AI

- Do not change any literal value in `_base-tokens.css` - the six hex
  literals there remain both the CSS fallback (if `<html>`'s inline style is
  ever absent) and the source for each field's Payload `defaultValue`. Only
  the explanatory comment changes.
- Do not touch `_alias-tokens.css`'s image/button radius or shadow rules -
  unrelated to this feature.
- The component from step 2 is generic over which field it's bound to (reads
  `path`/`field` from props); do not create six near-duplicate components.
- Keep the six fields as flat siblings on the `settings` global (not nested
  in a `group`) so `Setting.primaryColor` etc. stay flat, matching how
  `imageRadius`/`buttonRadius` are flat siblings today rather than nested
  under a `cornerRadius` group.
