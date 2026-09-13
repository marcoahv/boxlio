# Current Feature

**Title:** Add an "image as background" layout option to the Hero block
**Type:** Fix
**Status:** verified
**Branch:** `fix/hero-background-image-layout`

### The problem

`src/blocks/Hero/config.ts`'s `layout` radio only offers `imageRight`,
`imageLeft`, and `textOnly` (`Component.tsx:31` renders the image inline,
beside the text, for the first two). There's no way to use the Hero's image as
a full-bleed background behind the heading/subheading/buttons instead.

### The fix

Add a fourth layout value, `backgroundImage` ("Image background"). When
selected:

- The image renders full-bleed behind the whole section (not inside the
  `<Container>`, so it runs edge to edge like `<Section>`'s own background
  already does), with a dark scrim over it so text stays legible over any
  photo. Reuse `--color-scrim` (`_alias-tokens.css:110`), the same token
  already dimming the page behind the mobile nav drawer
  (`_header.css:419`) - no new colour token needed.
- The Hero's own text renders in a fixed, always-light color (see the
  dark-mode addendum below for why this isn't the `inverse` surface).
  Documented on the `layout` field so it isn't a silent surprise.
- Text/buttons render exactly as the `textOnly` layout already does (stacked,
  no inline image) since the image is no longer inline.

Needs one small supporting change: `MediaImage` (`src/components/MediaImage.tsx`)
only renders `next/image` in intrinsic width/height mode, which can't cover an
arbitrary-sized section. Add an optional `fill` prop that switches it to
`next/image`'s `fill` mode with `object-fit: cover` (new `.ui-img-cover`
utility beside the existing `.ui-img` one in `elements/_image.css`), for a
positioned parent to size. This is additive - every existing `MediaImage` call
site is unaffected since `fill` defaults to off.

New block-scoped CSS (`src/blocks/Hero/_hero.css`, following the
`blocks/Table/_table.css` precedent) for the three layering classes:
`.ui-hero-bg` (absolute, `inset: 0`, behind everything), `.ui-hero-scrim`
(absolute, `inset: 0`, `background-color: var(--color-scrim)`, above the
image), `.ui-hero-content` (`position: relative`, above both). Registered in
`styles/index.css` next to the Table import.

Must not break: `imageRight`/`imageLeft`/`textOnly` rendering and every
existing saved Hero block (none of them can already have
`layout: 'backgroundImage'`, so this is purely additive), and every other
`MediaImage` call site (`Hero`'s own inline-image branch, `PostPreview`,
`Card`, etc.) which don't pass `fill` and keep their current output.

### Build steps

- [x] 1. Wire the new layout end to end:
  - `src/blocks/Hero/config.ts`: add `{ label: 'Image background', value:
    'backgroundImage' }` to the `layout` radio's `options`, plus a short
    `admin.description` noting it overrides the Appearance surface with
    light text over a dark scrim; add a one-line `admin.description` on
    `image` noting it's used beside the text or as that background.
  - `src/components/MediaImage.tsx`: add an optional `fill` prop; when true,
    render `<Image fill .../>` with the new `.ui-img-cover` class instead of
    `width`/`height` + `.ui-img h-auto`.
  - `src/app/(frontend)/styles/elements/_image.css`: add the `.ui-img-cover`
    utility (`width: 100%; height: 100%; object-fit: cover;`).
  - `src/blocks/Hero/_hero.css` (new): `.ui-hero-bg`, `.ui-hero-scrim`,
    `.ui-hero-content` as described above.
  - `src/app/(frontend)/styles/index.css`: `@import
    '../../../blocks/Hero/_hero.css';` next to the Table import.
  - `src/blocks/Hero/Component.tsx`: when `layout === 'backgroundImage'` and
    the image resolves, render the background `MediaImage` (`fill`,
    `radius="none"`) and scrim as direct children of `<Section>` (siblings of
    `<Container>`, so they aren't width-constrained), wrap the existing inner
    content in `<Container className="ui-hero-content">`, and make sure the
    inline-image branch (`hasImage`) no longer fires for this layout (image
    isn't rendered twice).
  - Done when: a Hero block with `layout: 'backgroundImage'` and an image set
    renders that image full-bleed behind the section with a dark scrim and
    light, legible text; `imageRight`, `imageLeft`, and `textOnly` Hero blocks
    render exactly as before; and every other page using `MediaImage`
    (post previews, cards, blog listing) is visually unchanged.

### Verify

- `npm run build` passes.
- In the admin, add a Hero block to a page, pick **Image background**, upload
  an image: the live preview shows the photo behind the heading/buttons with
  legible text, edge to edge.
- Switch back to **Image right** / **Image left** / **Text only** on the same
  block: confirm each renders exactly as it did before this change.
- Spot-check one existing page that already has a Hero block: unchanged.
- Spot-check one other `MediaImage` consumer (e.g. a blog post card or the
  blog listing) to confirm it's visually unaffected.

## Addendum - scrim coverage control (whole image vs. text area only)

### The problem

The background-image layout above always darkens the *entire* image with
`.ui-hero-scrim` (full-bleed, `inset: 0` on the `<Section>`). There's no way
to keep the photo fully visible and only darken the area directly behind the
text.

### The fix

Add a `scrimCoverage` radio field to the Hero block (`full` default / `content`),
visible only when `layout === 'backgroundImage'` (same sibling-condition
pattern already used in `src/fields/link.ts:27`:
`condition: (_, siblingData) => siblingData?.layout === 'backgroundImage'`).

- `full` (default): unchanged - today's full-bleed `.ui-hero-scrim`.
- `content`: skip the full-bleed scrim entirely and instead darken just the
  text block's own wrapper (the flex div holding heading/subheading/buttons)
  with a new `.ui-hero-scrim-content` class: same `--color-scrim` token, plus
  padding and `border-radius: var(--radius-image)` - the same
  editor-controlled Image Corner Radius setting (`Settings` global) that
  `MediaImage`'s default `radius="site"` already uses, so the panel rounds
  the same as the images it sits over rather than a fixed radius of its own.
  That wrapper also gets `w-fit` in this mode, so the panel hugs the width of
  its widest line (heading, subheading up to its existing `max-w-[60ch]`, or
  the buttons row) instead of stretching to the full `<Container>` width - it
  must never be wider than the text/buttons it backs.

Must not break: the `full` mode (must render pixel-identical to the current,
just-shipped behavior), every non-`backgroundImage` layout (the field is
irrelevant and hidden for them), and existing saved Hero blocks (no
`scrimCoverage` value yet, so they fall back to the `full` default -
unchanged appearance).

### Build steps

- [x] 1. In `src/blocks/Hero/config.ts`, add the `scrimCoverage` radio field
  (options: `{ label: 'Whole image', value: 'full' }`, `{ label: 'Text area
  only', value: 'content' }`; `defaultValue: 'full'`) right after `layout`,
  with the sibling condition above.
  In `src/blocks/Hero/_hero.css`, add `.ui-hero-scrim-content`
  (`background-color: var(--color-scrim)`, `border-radius:
  var(--radius-lg)`, padding, matching `.header__scrim`'s nested `@variant
  atMedium { ... }` pattern for a larger pad at that breakpoint).
  In `src/blocks/Hero/Component.tsx`, read `scrimCoverage` off `props`; only
  render the full-bleed `.ui-hero-scrim` div when `hasBackgroundImage &&
  scrimCoverage !== 'content'`; add `.ui-hero-scrim-content` to the inner
  text-wrapper div's className when `hasBackgroundImage && scrimCoverage ===
  'content'`.
  - Done when: a background-image Hero set to **Whole image** looks exactly
    like before this step; set to **Text area only**, the photo shows fully
    with only a padded, rounded dark panel behind the heading/subheading/
    buttons, no wider than that content's own widest line; every other
    layout (`imageRight`/`imageLeft`/`textOnly`) is unaffected; and the field
    is hidden unless **Image background** is selected.

### Verify (addendum)

- `npm run build` passes.
- In the admin, on a Hero block already set to **Image background**: the new
  **Scrim coverage** control only appears for that layout.
- Set it to **Whole image**: unchanged from the already-shipped full-bleed
  scrim.
- Set it to **Text area only**: the photo is fully visible except for a dark,
  rounded panel directly behind the text/buttons.
- Switch layout to **Image right**/**Image left**/**Text only**: the
  scrim-coverage control disappears and rendering is unaffected either way.

## Addendum 2 - fix: Hero and Header text turned black in dark mode

### The problem

Forcing `surface="inverse"` on the background-image Hero (build step 1 above)
was wrong. `--color-on-surface-inverse` (`_alias-tokens.css:53`) is a
`light-dark()` pair - "whichever value default shows in light mode, inverse
shows in dark mode, and vice versa" (its own comment). It's the literal flip
of the *current* scheme, not a fixed "always light" color. In dark mode it
resolves to `--color-neutral-900` (near-black), so:

- The Hero's own heading/subheading/buttons rendered dark-on-dark.
- Worse, forcing `data-surface="inverse"` on the Hero also broke the sitewide
  `<Header>` whenever this Hero was the page's first section: its transparent
  Header adopts the first section's surface
  (`_header.css:215-217`: `body:has(main .ui-section:first-child[data-surface='inverse']) .header[...] { --header-fg: var(--color-on-surface-inverse); }`),
  so the header's nav links and social icons picked up the same broken,
  theme-flipping token and went black in dark mode too.

### The fix

- Stop overriding `surface` on the Hero's `<Section>` - always pass through
  the editor's actual choice (`<Section surface={surface} ...>`, no more
  `hasBackgroundImage ? 'inverse' : surface`). The Section's own
  background-color is irrelevant anyway (hidden behind the full-bleed photo),
  and this stops the Header adoption bug at the source: Header now sees
  whatever surface the editor actually picked, exactly like every other
  layout.
- Add a new fixed (non-`light-dark()`) token pair, following the existing
  `--color-on-danger`/`--color-on-success`/`--color-on-info` precedent (fixed
  foreground for a fixed background): `--color-on-scrim: var(--color-neutral-100)`
  next to `--color-scrim` in `_alias-tokens.css`. Since `--color-scrim` is
  itself scheme-independent (a `color-mix()`, no `light-dark()`), its paired
  foreground has to be fixed too, exactly like the project's "surfaces and
  their foregrounds are defined AS PAIRS" rule already requires for every
  other surface/foreground pair.
- Apply it directly to the Hero's own content wrapper only - `.ui-section
  .ui-hero-content { color: var(--color-on-scrim); }` in `_hero.css` (the
  compound selector is needed to match `.ui-section[data-surface='...']`'s
  specificity in `_section.css`, since `.ui-hero-content` alone is one class
  short of it). Scoped to the Hero's own markup, so it can't leak into
  Header's adoption logic the way the `data-surface` override did.

Must not break: every other Hero layout (`surface` was already passed through
unmodified for them), buttons (`.ui-btn`/`.ui-btn-outline`/`.ui-btn-ghost`
already set their own fixed `color`, independent of the inherited section
color, so they were never part of this bug), and every other use of `surface:
'inverse'` elsewhere in the site (Header, Footer, other blocks) - untouched,
since `--color-on-surface-inverse` itself isn't being changed, only no longer
force-applied here.

### Build steps

- [x] 1. In `src/app/(frontend)/styles/base/_alias-tokens.css`, add
  `--color-on-scrim` next to `--color-scrim`.
  In `src/blocks/Hero/Component.tsx`, change `<Section surface={hasBackgroundImage
  ? 'inverse' : surface} ...>` back to `<Section surface={surface} ...>`.
  In `src/blocks/Hero/_hero.css`, add `.ui-section .ui-hero-content { color:
  var(--color-on-scrim); }`.
  - Done when: with the site's color scheme set to dark, a background-image
    Hero's heading/subheading text is still light and legible (not black);
    when that Hero is the page's first section and the Header is transparent
    at the top of the page, the Header's nav links and social icons also
    stay legible (not black) in dark mode; and light mode, every other Hero
    layout, and every other page's Header rendering are all unchanged.

### Verify (addendum 2)

- `npm run build` passes.
- Switch the site to dark mode (theme toggle). On a background-image Hero:
  heading/subheading/button text stays light and readable, not black.
- Put that Hero first on a page with the Header's `transparentAtTop` on;
  scroll to top in dark mode: the Header's nav links and social icons stay
  legible, not black.
- Re-check light mode and every other Hero layout: unchanged from before this
  addendum.

## Addendum 3 - Header defaults to white text over a background-image Hero

### The problem

After addendum 2, a transparent Header over a background-image first section
adopts *whatever Surface the editor picked* for that Hero (e.g. its own
`--color-on-surface`, which is `light-dark()` and flips with the theme). That
is no longer literally broken (nothing goes black), but it isn't right
either: an arbitrary photo can't guarantee the same contrast a flat Surface
color can, so the Header's nav links and icons should default to white
whenever **Image background** is selected - regardless of the Hero's own
Surface choice, and regardless of the site's light/dark toggle (same fixed
requirement as the Hero's own text in addendum 2).

### The fix

Give `<Section>` (`src/components/primitives/Section.tsx`) a new optional
`hasBackgroundImage` prop that renders a `data-has-background-image="true"`
attribute alongside the existing `data-surface`/`data-spacing` ones - a
narrow, generic capability any future full-bleed-image block can reuse, not
Hero-specific. Hero passes its existing `hasBackgroundImage` local through to
it.

Add one more Header adoption rule in `_header.css`, requiring
`data-position='fixed'` in addition to `data-transparent='true'`: a static
header sits in normal document flow above the first section rather than
floating over it (the Position section's own existing comment already notes
"transparent at top" has no visual effect there), so it never actually
overlaps the photo and must keep following the four surface-adoption rules
normally instead:

```css
body:has(main .ui-section:first-child[data-has-background-image])
  .header[data-position='fixed'][data-transparent='true']:not(.header--scrolled) {
  --header-fg: var(--color-on-scrim);
}
```

The extra `[data-position='fixed']` attribute also makes this rule strictly
more specific than the four `[data-surface='...']` ones, so it wins outright
wherever it applies rather than relying on a declaration-order tie-break.

`--color-on-scrim` is the fixed (non-`light-dark()`) token already added in
addendum 2 - reusing it here, rather than a new white literal, is what makes
this stay white through a light/dark toggle for free, with no separate
dark-mode rule needed.

Must not break: every other first-section Surface's existing Header adoption
(the four `[data-surface=...]` rules are untouched; this only takes priority
when `data-has-background-image` is also present on a *fixed* header), a
*static* header over a background-image Hero (falls through to the normal
surface-adoption rules and keeps following the theme toggle, since this new
rule's selector doesn't match it at all), the Hero's own logo-swap adoption
rules (untouched - out of scope for this request, which named only
links/icons), and non-background-image Hero layouts (`hasBackgroundImage` is
`false`/absent for them, so the new attribute and rule never apply).

### Build steps

- [x] 1. Add the `hasBackgroundImage` prop + `data-has-background-image`
  attribute to `Section.tsx`; pass it from `Hero/Component.tsx`; add the new
  adoption rule to `_header.css`, gated on `data-position='fixed'` as well as
  `data-transparent='true'`.
  - Done when: a background-image Hero as the page's first section, with a
    *fixed* Header transparent at the top, shows white nav links/icons
    regardless of that Hero's own Surface setting, and stays white through a
    light/dark toggle; the same page with the Header set to *static* instead
    follows its normal surface-adoption color and the theme toggle exactly
    like any other Surface; every other first-section Surface's Header
    adoption is unchanged; non-background-image Hero layouts are unaffected.

### Verify (addendum 3)

- `npm run build` passes.
- Page with a background-image Hero first, Header position **Fixed** and
  transparent, scrolled to top: nav links/icons are white, in both light and
  dark mode, regardless of the Hero's own Surface field.
- Toggle the site theme while at the top of that page: the Header's
  links/icons stay white throughout.
- Same page, Header position **Static**: nav links/icons follow the theme
  toggle normally (not forced white), exactly as they would over any other
  first-section Surface.
- A page whose first section is a non-background-image block: Header
  adoption unchanged (still follows that section's real Surface).
