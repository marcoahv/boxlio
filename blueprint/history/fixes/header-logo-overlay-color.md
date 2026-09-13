# Current Feature

**Title:** Make the Header logo follow the same overlay-based color as the Header text
**Type:** Fix
**Status:** verified
**Branch:** `fix/header-logo-overlay-color`

### The problem

The transparent Header's nav links/icons already adopt fixed colors based
on the background-image Hero's overlay (`_header.css`'s
`data-has-background-image`/`data-overlay-text-color` rules, added in the
last two fixes): light by default, dark when Overlay color is **Light** at
**Whole image** coverage, and always light for **Text area only**. The
Header's **logo** has no equivalent rule at all - `Logo.tsx` renders both a
normal (`.ui-logo__img--logo`) and a light/dark-background variant
(`.ui-logo__img--logo-dark`), and `_header.css` only swaps between them
based on the Header's own `data-surface` (the "Logo mirror" section,
`_header.css:256-379`). Over a background-image Hero, the logo just keeps
whatever the Header's own Surface dictates - unrelated to, and potentially
mismatched with, the nav text color right next to it (e.g. a dark logo
sitting beside white nav text).

### The fix

Add two new rules to the existing "Logo mirror" section, keyed off the
exact same `data-has-background-image`/`data-overlay-text-color`
attributes the text rules already read - no `Component.tsx`/`Section.tsx`
changes needed, since that plumbing is already correct for both overlay
coverage modes (`hasBackgroundImage` is unconditional on coverage,
`hasDarkOverlayText` is `false` whenever coverage is `content`, so both
cases already fall through to the same "light logo" default automatically):

```css
/* Logo mirror of the background-image --header-fg rules above. Both are
   fixed pairings, not theme-relative (see --color-on-overlay's comment),
   so unlike the Surface-based logo mirror this needs no light/dark
   media-query variants - one rule per case is enough. */
body:has(main .ui-section:first-child[data-has-background-image])
  .header[data-position='fixed'][data-transparent='true']:not(.header--scrolled)
  .ui-logo__img--logo {
  display: none;
}
body:has(main .ui-section:first-child[data-has-background-image])
  .header[data-position='fixed'][data-transparent='true']:not(.header--scrolled)
  .ui-logo__img--logo-dark {
  display: block;
}

body:has(main .ui-section:first-child[data-has-background-image][data-overlay-text-color='dark'])
  .header[data-position='fixed'][data-transparent='true']:not(.header--scrolled)
  .ui-logo__img--logo {
  display: block;
}
body:has(main .ui-section:first-child[data-has-background-image][data-overlay-text-color='dark'])
  .header[data-position='fixed'][data-transparent='true']:not(.header--scrolled)
  .ui-logo__img--logo-dark {
  display: none;
}
```

**Specificity:** each new rule is the matching `--header-fg` rule's own
selector (already verified: base (0,7,2), dark-text override (0,8,2)) plus
one more class for the logo image (`.ui-logo__img--logo`/`-dark`), giving
(0,8,2) and (0,9,2) respectively - the dark-text pair still strictly
outranks the base pair, same margin as the text rules, so it wins whenever
both match.

Must not break: the four existing Surface-based logo-mirror rules
(different attribute, unaffected), non-background-image sections (new
rules never match), Static-position Headers (gated on
`data-position='fixed'`, same as the text rules), and the Header's own
non-transparent/scrolled logo behavior.

### Build steps

- [x] 1. Add the two rule-pairs above to `_header.css`'s "Logo mirror"
  section (after the existing four-surface block, before the `.header__logo`
  positioning rule).
  - Done when: a Fixed+transparent Header over a background-image Hero
    shows the light-colored logo variant by default (Dark/Primary/Secondary
    overlay color, or Text area only coverage regardless of overlay color),
    and the normal/dark logo variant specifically for Light overlay color at
    Whole image coverage - matching the nav text color exactly in every
    case; the four Surface-based logo rules and every non-background-image
    page are unaffected.

### Verify

- `npm run build` passes.
- Fixed+transparent Header, background-image Hero, **Whole image** coverage,
  **Dark**/**Primary**/**Secondary** overlay color: logo shows its
  light-colored variant (matches white nav text).
- Same setup, **Light** overlay color: logo switches to its normal/dark
  variant (matches dark nav text).
- Switch to **Text area only** coverage: logo shows its light-colored
  variant regardless of Overlay color (matches the nav text's fixed-white
  default in this mode).
- Toggle the site theme in each case: the logo choice stays fixed, doesn't
  flip.
- Header set to **Static**, or a page whose first section isn't a
  background-image Hero: logo follows the existing Surface-based rules,
  unaffected by this change.

## Addendum 2 - fix: Header logo flipped on scroll when OS scheme disagreed with the explicit theme

### The problem

Separately diagnosed while verifying the above (not caused by it, and not
related to background-image/overlay at all - a pre-existing bug in the base
"--- Logo ---" section, `_header.css:40-83`): the base section's
`html[data-theme]` override only covered 2 of the 4 Surface x theme
combinations (`dark`+Default, `light`+Inverse - the two "flip" cases),
relying on `elements/_logo.css`'s plain fallback (`logo`=block,
`logo-dark`=none) for the other two. That fallback only gives the right
answer when the visitor's OS color-scheme preference happens to agree with
their explicit `data-theme` choice. `@media (prefers-color-scheme)` always
reflects the real OS setting and has no awareness of `data-theme` -
unlike `light-dark()` (which `--header-fg`/`--header-bg` are built from,
and which *does* respect the `color-scheme` property `data-theme` sets in
`_reset.css`).

Confirmed via a live DevTools check: Header Surface=Default, OS
preference=dark, explicit site theme=light. At the top of the page
(adoption phase, `:not(.header--scrolled)`), the *adoption* mirror's own
`html[data-theme='light']` override (which already covered all 4
combinations) correctly won, showing the normal logo. Once scrolled, control
passes to the base section - which has no `light`+Default override - so the
unopposed `@media (prefers-color-scheme: dark)` rule won instead, flipping
to the dark-variant (light-colored) logo. `--header-fg` stayed correct
throughout (via `light-dark()`), so only the logo visibly flipped - exactly
matching what was reported.

### The fix

Add the two missing explicit rules to the base section, completing all 4
combinations exactly like the adoption mirror already does:

```css
html[data-theme='light'] .header[data-surface='default'] .ui-logo__img--logo {
  display: block;
}
html[data-theme='light'] .header[data-surface='default'] .ui-logo__img--logo-dark {
  display: none;
}

html[data-theme='dark'] .header[data-surface='inverse'] .ui-logo__img--logo {
  display: block;
}
html[data-theme='dark'] .header[data-surface='inverse'] .ui-logo__img--logo-dark {
  display: none;
}
```

Verified against the actual compiled CSS served by the dev server (not just
source): all 8 (surface x theme x logo-variant) combinations are present
with the correct `display` value - the build tool merges two of the eight
into one compound selector since they share an identical declaration, which
is specificity- and behavior-neutral.

Must not break: the two pre-existing "flip" rules (untouched), the OS-only
`@media` rules above them (still the correct fallback for visitors with no
explicit `data-theme`, i.e. following their OS setting exactly), Muted/Accent
surfaces (unaffected, no override needed since those are fixed regardless of
scheme), and the adoption mirror (already complete, untouched).

### Build steps

- [x] 1. Add the two missing rule-pairs to `_header.css`'s base "--- Logo
  ---" section, after the existing two `html[data-theme]` overrides.
  - Done when: with OS preference and explicit `data-theme` set to
    *disagreeing* values (e.g. OS dark + explicit light, or OS light +
    explicit dark), the Header's logo shows the same variant both before
    and after scrolling past a first section whose Surface matches the
    Header's own Surface - no flip - confirmed against the compiled CSS.

### Verify (addendum 2)

- `npm run build` passes.
- Compiled CSS (`curl` the page, find the linked stylesheet, `curl` it)
  contains explicit `html[data-theme='light'] .header[data-surface='default']`
  and `html[data-theme='dark'] .header[data-surface='inverse']` rules for
  both logo variants.
- With OS dark + explicit light theme (or the reverse), Header
  Surface=Default (or Inverse) matching the first section's Surface: the
  logo variant shown at the top of the page matches the variant shown after
  scrolling - no flip.
- With OS and explicit theme in agreement (the common case): unchanged from
  before this addendum.
