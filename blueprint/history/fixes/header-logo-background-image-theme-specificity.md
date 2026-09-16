# Current Feature

**Title:** Header logo shows the wrong variant over a background-image Hero when a theme is explicitly set
**Type:** Fix
**Status:** verified
**Branch:** `fix/header-logo-background-image-theme-specificity`

### The problem

Reproduced: Header Position = Fixed, "Start transparent at top" = on, Hero
layout = Background Image, Overlay color = Dark/Primary/Secondary (not
Light). Expected the light-colored logo variant (`.ui-logo__img--logo-dark`)
at the top of the page, matching the white nav text right next to it.
Instead the normal/dark-text logo (`.ui-logo__img--logo`) shows — wrong from
first paint, before any scrolling.

Root cause: a CSS specificity race in `src/globals/Header/Component/_header.css`
between two rule families that both target `.ui-logo__img--logo`/
`--logo-dark`, both matching the same element at once, because a Hero's
`surface` field (Default/Muted/Inverse/Accent) and its `layout` field
(Background Image or not) are independent — a background-image Hero still
carries a `data-surface` value, so its `<section>` has both
`data-surface='default'` (for example) *and* `data-has-background-image='true'`
simultaneously.

- The **background-image logo mirror** (added in the `header-logo-overlay-color`
  fix, ~lines 405-429) keys off `[data-has-background-image]` and is meant to
  win unconditionally. Its specificity for the base pair is **(0,8,2)**.
- The **surface-adoption logo mirror**'s plain `@media (prefers-color-scheme)`
  rules (~lines 286-332) key off `[data-surface='default'|'inverse']` and are
  correctly lower at **(0,7,2)** — background-image wins here, no bug.
- But that same family's **`html[data-theme='light'|'dark']` "manual override
  mirror"** rules (~lines 338-386, added later in the same fix to handle
  OS-scheme-vs-explicit-theme disagreement — see that fix's "Addendum 2")
  prepend an extra `html[data-theme=...]` type+attribute compound. That pushes
  their specificity to **(0,8,3)** — tied with the background-image rule on
  IDs (0) and classes/attributes (8), but ahead on type-selector count (3 vs
  2), so **the theme-prefixed surface rule wins the tie**, whenever the
  visitor has an explicit theme set (`data-theme` on `<html>` — set by
  `themeInitScript()` once anyone has used the theme toggle, including during
  testing) and the Hero's own surface is Default or Inverse.

This only affects the **logo images**, not `--header-fg` (nav text): that
custom property's surface-adoption rule has no `html[data-theme]`-prefixed
variant (its `light-dark()` value already tracks the `color-scheme` property
`data-theme` sets, with no separate override needed), so it stays correctly
beaten by the background-image `--header-fg` rule at every specificity
comparison. Matches the report: only the logo was described as wrong.

### The fix

Make background-image sections structurally excluded from the surface-based
logo-mirror rules, instead of relying on winning a specificity race that a
future attribute addition could tip again (as this one did). In
`src/globals/Header/Component/_header.css`, add `:not([data-has-background-image])`
to the `.ui-section:first-child[data-surface='default'|'inverse'|'muted'|'accent']`
compound everywhere it appears inside the "Logo mirror of the four
--header-fg overrides" section (~lines 280-403 — the two
`@media (prefers-color-scheme)` blocks, the four `html[data-theme]` blocks,
and the muted/accent block). Applying it to all occurrences uniformly (not
just the two that numerically lose today) removes the whole class of
specificity-order fragility, not just today's manifestation of it.

Must not break:
- `--header-fg` (lines 229-278, untouched) — already correct, not part of this
  fix.
- The base "--- Logo ---" section (lines 40-107, untouched) — governs the
  header's own non-adoption logo swap, unrelated to this adoption-vs-hero
  conflict.
- The background-image logo mirror itself (lines 405-429, untouched) —
  already correct; this fix just removes its competition instead of changing
  it.
- Every surface-adoption case where the first section has **no** background
  image — those keep exactly their current (correct) behavior, since
  `:not([data-has-background-image])` only removes matches that had the
  attribute present.

### Build steps

1. [x] Add `:not([data-has-background-image])` to each of the twenty
   `[data-surface='default'|'inverse'|'muted'|'accent']` occurrences in
   `_header.css`'s "Logo mirror of the four --header-fg overrides" section.
   Done when: with an explicit theme set (`data-theme` on `<html>`), Header
   Fixed + transparent, Hero surface Default (or Inverse), Hero layout
   Background Image, Overlay color Dark/Primary/Secondary — the header shows
   the light-colored logo variant at the top of the page, matching the nav
   text. The same Hero with Overlay color Light still shows the normal/dark
   logo variant (unaffected — that's the separate `data-overlay-text-color`
   override, still lower-specificity-safe since it never competed with the
   surface family in the first place). A non-background-image page with
   Header Surface Default/Inverse still adopts the first section's surface
   for the logo exactly as before, with an explicit theme set. `npm run
   build` and `npm run lint` pass with no new warnings.

### Verify

`npm run dev`. In `/admin`, use the ThemeToggle on the live site once (so
`data-theme` is stored and set on `<html>`) with theme set to Light, then:

- Hero: layout Background Image, surface Default, overlay color Dark (or
  Primary/Secondary/none). Header: position Fixed, transparent at top on.
  At the very top of the page (no scrolling), the header logo should be the
  light-colored variant, matching the white nav links.
- Same setup with Hero surface Inverse: same result (light-colored logo).
- Switch the explicit theme to Dark and repeat both: still the light-colored
  logo (fixed pairing, not theme-relative, per `--color-on-overlay`'s
  design).
- Hero overlay color Light (Whole image coverage): the header logo should
  switch to the normal/dark-text variant instead (unchanged from before this
  fix).
- A page whose first section is **not** a background-image Hero, Header
  Surface Default or Inverse, explicit theme set: logo still swaps with the
  section's own surface exactly as before (regression check for the
  untouched Addendum 2 behavior).
- Scroll down: header goes solid/opaque and reverts to its own configured
  Surface's logo, unchanged from current behavior.
