# Current Feature

**Title:** Add overlay color and opacity controls to the Hero background-image layout
**Type:** Fix
**Status:** verified
**Branch:** `fix/hero-overlay-color-opacity`

### The problem

The Hero's **Image background** overlay is currently a single hardcoded look:
`--color-overlay` (a fixed 50%-black tint) with fixed light text
(`--color-on-overlay`). There's no editor control over which color the
overlay uses or how strong (opaque) it is.

### The fix

Two new fields on the Hero block, both visible only when `layout ===
'backgroundImage'` (same sibling condition already used by
`overlayCoverage`):

- **Overlay color** (radio, default `dark`): `Dark` / `Light` / `Primary` /
  `Secondary`.
- **Overlay opacity** (radio, default `medium`): `None` (0%) / `Light`
  (25%) / `Medium` (50%) / `Strong` (75%) / `Solid` (100%). `None` is how an
  editor gets "no overlay" - reusing the opacity field rather than a
  separate toggle, since 0% already means exactly that with no new field,
  no new conditional-visibility logic, and no combinatorial case to handle
  differently. The **Overlay color** field stays visible but has no visible
  effect at `None` - normal, unconfusing admin UX (a sibling field that's
  temporarily inert, not hidden).

**Color and opacity are decoupled** rather than baked into one fixed recipe
per color, using two CSS custom properties consumed by one shared
`color-mix()`:

```css
.ui-hero-overlay,
.ui-hero-overlay-content {
  --hero-overlay-color: var(--color-overlay-tint-dark);
  --hero-overlay-alpha: 50%;
  background-color: color-mix(
    in srgb,
    var(--hero-overlay-color) var(--hero-overlay-alpha),
    transparent
  );
}
```

Color and opacity modifier classes (`.ui-hero-overlay--light/-primary/-secondary`,
`.ui-hero-overlay-opacity--none/-light/-strong/-solid`) each override just
one of those two custom properties, so all 20 combinations work without 20
separate CSS rules. `dark`/`medium` (the defaults) need no modifier class at
all - the base rule's own values already match them exactly, which is what
keeps every already-saved Hero block (no `overlayColor`/`overlayOpacity`
value yet) pixel-identical to today.

**New fixed (non-`light-dark()`) solid tint tokens**, kept separate from the
existing `--color-overlay` (`_alias-tokens.css:110`, still used as-is by the
mobile drawer's `.header__overlay` - must not change):

| Token | Value | Reused text color |
| --- | --- | --- |
| `--color-overlay-tint-dark` | `--color-neutral-1000` (solid black) | `--color-on-overlay` (existing, light) |
| `--color-overlay-tint-light` | `--color-neutral-0` (solid white) | `--color-on-overlay-light` (new, dark) |
| `--color-overlay-tint-primary` | `--color-primary-dark` | `--color-on-overlay` (light) |
| `--color-overlay-tint-secondary` | `--color-secondary-dark` | `--color-on-overlay` (light) |

Primary/Secondary reuse `--color-primary-dark`/`--color-secondary-dark` -
the same fixed "-dark" brand shades `_button.css` already treats as dark
enough for fixed light text (`--color-on-surface-muted-hover`'s comment) -
rather than the lighter base `--color-primary`/`--color-secondary`.

**Correctness note on why opacity is a `background-color` alpha, not CSS
`opacity`:** `.ui-hero-overlay-content` (the "Text area only" panel) also
*contains* the heading/subheading/buttons as children. CSS `opacity` on an
element fades its children too, which would make the text translucent -
wrong. `color-mix()`'s alpha only affects the background paint layer, never
the element's own content, so it's the only correct mechanism for that
element. `.ui-hero-overlay` (the full-bleed layer) has no children either
way, so using the same mechanism for both keeps one recipe instead of two.

**Accepted tradeoff:** a very low opacity (e.g. `light`, 25%, or `none`, 0%)
combined with a busy or light photo can reduce contrast for the fixed
overlay text below what `full`-coverage guarantees at the default 50%. This
is an intentional consequence of giving editors real intensity control, not
a regression - the same tradeoff already exists for the "Text area only"
coverage option, and `none` is simply its most extreme, fully-expected form:
choosing "no overlay" means choosing to rely on the photo alone for
contrast.

Must not break: `overlayCoverage`'s existing `full`/`content` behavior,
every non-`backgroundImage` layout, the mobile drawer's `.header__overlay`
(untouched, still reads the original `--color-overlay`/`--color-on-overlay`
pair directly), and every already-saved Hero block's exact current
appearance (`dark` + `medium` renders identically to today, per the
composition above).

### Build steps

- [x] 1. `src/app/(frontend)/styles/base/_alias-tokens.css`: add the four
  `--color-overlay-tint-*` tokens and `--color-on-overlay-light`, next to
  the existing `--color-overlay`/`--color-on-overlay` pair (leave that pair
  untouched).
  `src/blocks/Hero/config.ts`: add the `overlayColor` and `overlayOpacity`
  radio fields after `overlayCoverage`, per the options above.
  `src/blocks/Hero/_hero.css`: rework `.ui-hero-overlay`/
  `.ui-hero-overlay-content`'s `background-color` to the shared
  `color-mix()` + custom-property composition, add the color/opacity
  modifier classes, and add `.ui-hero-content--on-light` (compound with
  `.ui-section .ui-hero-content` for specificity, same pattern as the
  existing dark-mode-fix override).
  `src/blocks/Hero/Component.tsx`: read `overlayColor`/`overlayOpacity` off
  `props`, default to `'dark'`/`'medium'`, and apply the resulting modifier
  classes to the overlay div, the content-only panel div, and (for the text
  color) the `<Container className="ui-hero-content">`.
  - Done when: a background-image Hero left at the defaults renders
    pixel-identical to before this fix; every Color x Opacity combination
    renders the expected tint/strength with correctly-paired text color,
    including `None` making the overlay fully invisible; `overlayCoverage`'s
    full vs. content-only behavior and every other Hero layout are
    unaffected; and the mobile nav drawer's dimming overlay is unaffected.

### Verify

- `npm run build` passes.
- In the admin, a Hero block set to **Image background** shows **Overlay
  color** and **Overlay opacity** fields; both are hidden for any other
  layout.
- Leave both at their defaults (Dark / Medium): renders identical to the
  already-shipped look.
- Try each Overlay color (Light/Primary/Secondary) at Medium opacity: the
  tint changes, text stays legible (light text on Dark/Primary/Secondary,
  dark text on Light).
- Try each Overlay opacity (None/Light/Strong/Solid) on one color: the tint
  gets visibly weaker/stronger; at `None` the overlay disappears entirely
  (photo fully visible, Overlay color has no visible effect); at `Solid` the
  photo is fully hidden behind the tint.
- Confirm the "Text area only" `overlayCoverage` panel's text is fully
  opaque and legible at every opacity setting, not faded.
- Confirm the mobile nav drawer's dimming overlay (hamburger menu) is
  unaffected.

## Addendum - fix: transparent Header stayed white text over a Light overlay

### The problem

`_header.css`'s Header-adoption rule for a background-image first section
was written before `overlayColor` existed: it always forces the Header's
text to fixed light (`--color-on-overlay`) whenever the first section has a
background image, with no awareness of which overlay color was actually
chosen. But the Hero's own text correctly switches to fixed DARK text
(`--color-on-overlay-light`) specifically for `overlayColor === 'light'`.
Result: pick **Light** overlay color, and a Fixed+transparent Header
floating over that same Hero keeps showing white nav links/icons - poor
contrast against a light tint. (Confirmed reverting the Header to
"theme-relative" instead is the wrong fix - it would reintroduce the exact
dark-mode-black-text bug already fixed twice this session, for the
dark/primary/secondary overlay colors, all of which need fixed light text
regardless of the site theme.)

### The fix

Extend `hasBackgroundImage`'s existing mechanism (`Section.tsx` ->
`data-has-background-image` -> `_header.css` adoption rule) with one more
optional, generic prop: `hasDarkOverlayText?: boolean`, rendered as a new
`data-overlay-text-color="dark"` attribute (only present alongside
`hasBackgroundImage`). Hero passes it using the exact same condition
already driving its own `.ui-hero-content--on-light` class
(`resolvedOverlayColor === 'light'`), so the Hero's own text and the
Header's adopted text can never drift out of sync.

`_header.css` keeps its existing rule (light text, unconditional on overlay
color) completely unchanged, and gets one new rule directly after it for
the dark-text case, gated on the extra `[data-overlay-text-color='dark']`
attribute - which also makes it strictly more specific (one more attribute
selector inside the `:has()` argument: (0,8,2) vs the existing rule's
(0,7,2)), so it wins outright whenever both match, with no
declaration-order dependency.

Must not break: the existing rule's behavior for dark/primary/secondary
(unchanged selector, unchanged value), the four Surface-adoption rules, the
Header logo-swap mirror rules (untouched - scoped to `data-surface` only,
out of scope here per the user's request naming only text/icons), the
Static-position case (this whole mechanism only ever applies to
`data-position='fixed'`), and every non-background-image Hero/section
(neither new attribute is ever rendered for them).

### Build steps

- [x] 1. `Section.tsx`: add `hasDarkOverlayText` prop and
  `data-overlay-text-color` attribute.
  `Hero/Component.tsx`: pass `hasDarkOverlayText={resolvedOverlayColor ===
  'light'}` to `<Section>`.
  `_header.css`: add the new, more-specific adoption rule right after the
  existing one.
  - Done when: a Fixed+transparent Header over a background-image Hero set
    to **Light** overlay color shows dark nav text; the same Header over
    dark/primary/secondary overlay colors still shows light text; neither
    case flips with the site's light/dark theme toggle; Static-position
    Headers and non-background-image sections are unaffected.
- [x] 2. Refinement: the overlay color's dark-text case
  (`overlayColor: 'light'`) only makes sense for the Header when the tint
  actually covers the area the Header floats over - true for
  `overlayCoverage: 'full'` ("Whole image"), not for `'content'` ("Text
  area only"), where the tint is a small panel behind the text and the rest
  of the photo (including wherever the Header sits) is untinted and
  arbitrary. For `'content'` coverage, the Header should still default to
  the same fixed **white** it always used before `overlayColor` existed
  (the only generically-safe guess against an untinted, arbitrary photo),
  regardless of which Overlay color is selected - not fall back to a
  theme-relative Surface color, and not follow `overlayColor` either.
  `Hero/Component.tsx`: keep `hasBackgroundImage={hasBackgroundImage}`
  passed to `<Section>` unconditional on coverage (so the base "force fixed
  white text" rule keeps applying in both coverage modes, as it always
  did), and instead scope the dark-text override itself:
  `hasDarkOverlayText={overlayOverWholeImage && resolvedOverlayColor ===
  'light'}`. The Hero's own two other uses of the `hasBackgroundImage`
  local (rendering the photo itself, and its own `ui-hero-content`
  text-color class) are unaffected either way.
  - Done when: with `overlayCoverage: 'content'`, a Fixed+transparent
    Header over that Hero shows fixed white nav links/icons no matter which
    Overlay color is selected (including Light); with `overlayCoverage:
    'full'`, behavior is exactly as step 1 describes (white for
    dark/primary/secondary, dark for light).

### Verify (addendum)

- `npm run build` passes.
- Fixed+transparent Header, background-image Hero, **Light** overlay color,
  scrolled to top: nav links/icons render dark, matching the Hero's own
  now-dark heading.
- Same setup with **Dark**/**Primary**/**Secondary** overlay color: nav
  links/icons render light/white, as before.
- Toggle the site theme for each case above: the Header's text stays fixed
  (never flips with the theme).
- Switch that same Hero's overlay coverage to **Text area only**: the
  Header's nav links/icons show fixed white regardless of which Overlay
  color is selected (including Light), and stay white through a theme
  toggle.
- Header set to **Static**: nav links/icons follow the Header's own normal
  Surface-adoption color regardless of overlay color - unaffected by this
  change.
- A page whose first section is not a background-image Hero: Header
  adoption unchanged.
