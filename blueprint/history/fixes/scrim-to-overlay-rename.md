# Current Feature

**Title:** Rename "scrim" references to "overlay"
**Type:** Fix
**Status:** verified
**Branch:** `fix/scrim-to-overlay-rename`

### The problem

The Hero background-image work (just merged) introduced "scrim" as the term
for the dark layer over a background photo - a real term from theater/film
lighting, but a less common word than "overlay" for what it does. Every
occurrence, code identifier, and user-facing label should read "overlay"
instead. Full inventory (`grep -rniE "scrim" src`):

- Design tokens (`_alias-tokens.css:110,120`): `--color-scrim`,
  `--color-on-scrim`
- Hero block CSS (`_hero.css:17,21,37,45-46`): `.ui-hero-scrim`,
  `.ui-hero-scrim-content`, both token references, plus comments
- Hero block config (`Hero/config.ts:34,44-45`): the `scrimCoverage` field
  name, its `label: 'Scrim coverage'`, and an admin description mentioning
  "a dark scrim"
- Hero component (`Hero/Component.tsx:29,36-39,56,66`): the destructured
  `scrimCoverage` prop and the `scrimOverWholeImage`/`scrimOverContentOnly`
  locals, plus the two class name strings that use them
- Site Header (`HeaderClient.tsx:244`, `_header.css:229,240,429,431,437,449`):
  the mobile-drawer `.header__scrim`/`.header__scrim--visible` classes
  (pre-existing, from before the Hero work) and the `--color-on-scrim`
  reference added for the Hero's Header-adoption rule
- `src/payload-types.ts` - generated from `Hero/config.ts`, regenerates
  automatically once the field is renamed there (not hand-edited)

### The fix

Rename every identifier above, `scrim` -> `overlay`, case-preserved
(`Scrim` -> `Overlay`, `SCRIM` -> n/a - none exist):

| Old | New |
| --- | --- |
| `--color-scrim` | `--color-overlay` |
| `--color-on-scrim` | `--color-on-overlay` |
| `.ui-hero-scrim` | `.ui-hero-overlay` |
| `.ui-hero-scrim-content` | `.ui-hero-overlay-content` |
| `.header__scrim` | `.header__overlay` |
| `.header__scrim--visible` | `.header__overlay--visible` |
| `scrimCoverage` (field name + prop) | `overlayCoverage` |
| `'Scrim coverage'` (field label) | `'Overlay coverage'` |
| `scrimOverWholeImage` | `overlayOverWholeImage` |
| `scrimOverContentOnly` | `overlayOverContentOnly` |
| "a dark scrim" (admin description, comments) | "a dark overlay" |

Pure rename: no behavior, layout, color, or field option values (`'full'` /
`'content'`) change anywhere.

One accepted, low-risk edge case: `scrimCoverage` is a real Payload field
name (a persisted Mongo key), and this project's MongoDB setup has no
migration step for a field rename (`coding-standards.md`'s Database
section). Renaming it means any already-saved Hero block explicitly set to
`scrimCoverage: 'content'` would silently read as the `overlayCoverage`
default (`'full'`) instead - a one-time cosmetic reversion to the full-image
overlay, not data loss (re-selecting "Text area only" fixes it), and one
that's essentially theoretical right now since this field merged into `main`
only in this same session, before any real editor content could have used
it. Flagging it rather than silently deciding it doesn't matter.

Must not break: every current Hero background-image visual behavior (whole
vs. text-area overlay, its width/radius, dark-mode legibility, the Header's
fixed-vs-static adoption logic) - only names change, not what they render or
how the CSS cascade resolves.

### Build steps

- [x] 1. Apply the full rename table above across `_alias-tokens.css`,
  `Hero/_hero.css`, `Hero/config.ts`, `Hero/Component.tsx`,
  `HeaderClient.tsx`, and `_header.css` (both the pre-existing mobile-drawer
  scrim classes and the Hero-adoption rule's token reference), including
  every comment that says "scrim". Then regenerate/verify
  `src/payload-types.ts` picks up the renamed `overlayCoverage` field.
  - Done when: `grep -rniE "scrim" src` returns nothing outside
    `blueprint/history/` (the archived fix stays as written - historical
    record, not a live doc); `npm run build` passes; and manually verified
    Hero background-image rendering (both overlay-coverage modes, both color
    schemes, fixed vs. static Header) is pixel-identical to before the
    rename.

### Verify

- `grep -rniE "scrim" src` - no matches.
- `npm run build` passes.
- In the admin, a Hero block already set to **Image background** now shows
  an **Overlay coverage** field (was **Scrim coverage**), same two options.
- Visually re-check everything the prior fix verified: whole-image overlay,
  text-area-only overlay (hugging content width, matching Image Corner
  Radius), legible text in both light and dark mode, and the
  fixed-vs-static Header behavior - all unchanged from before this rename.
- Confirm the pre-existing mobile nav drawer overlay (hamburger menu) still
  dims and shows/hides correctly - it only changed class names.
