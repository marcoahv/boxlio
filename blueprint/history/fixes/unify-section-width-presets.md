# Current Feature

**Title:** Unify section width presets
**Type:** Fix
**Status:** verified
**Branch:** `fix/unify-section-width-presets`

## The problem

`Settings -> Whitespace` has four width groups (Header, Hero, Sections, Rich
Text), all under the same tab, but they don't share one scale:

- **Header** (`headerWidth`), **Hero** (`heroWidth`), and **Rich Text**
  (`richTextWidth`) each pick a literal preset from `WIDTH_OPTIONS`
  (Narrow/Default/Wide/Full Screen), resolving to a fixed rem value: 72rem /
  114rem / 144rem / none.
- **Sections** (`containerScale`) is a different kind of control entirely: a
  0.85x/1x/1.15x density multiplier (`sm`/`md`/`lg`, labeled Narrow/Default/
  Wide) applied on top of one fixed 114rem base. It can never reach the same
  144rem "Wide" that Header/Hero/Rich Text reach, and every regular block
  (FeatureGrid, Table, Footer, FeaturedPost, BlogListing, the blog post's own
  header/related-posts containers) is pinned to that one 114rem base with no
  way to pick Narrow/Wide at all.
- On top of that, `--container-scale` (Sections' own multiplier) is *also*
  layered onto Header/Hero/Rich Text's literal presets
  (`--hero-max-width: calc(114rem * var(--container-scale, 1))` etc. in
  `_alias-tokens.css`), so all four groups already interact today, just
  inconsistently - Header/Hero/Rich Text get a literal base *and* the
  multiplier; Sections' own consumers only ever get the multiplier.
- Three call sites hardcode a literal `width` prop directly in code, outside
  any Settings control: `CallToAction` (`width="narrow"`), `PostNavigation`
  (`width="narrow"`), `Breadcrumbs` (`width="default"`).

Net effect: picking "Wide" in different Whitespace groups produces different
actual widths, and several blocks have no width control at all.

## The fix

Make **Sections** a literal preset field too, using the same `WIDTH_OPTIONS`
(Narrow/Default/Wide/Full Screen) and the same narrow=72rem/default=114rem/
wide=144rem/full=none scale as Header/Hero/Rich Text, and drop the multiplier
entirely so "Wide" means the same 144rem everywhere. Sections' new preset
governs every block that isn't Header, Hero, or Rich Text: FeatureGrid, Table,
CallToAction, PostNavigation, Breadcrumbs, Footer, FeaturedPost, BlogListing,
and the blog post's own header/related-posts containers. Width control stays
site-wide in Settings/Whitespace only - no per-block-instance width fields.

Must not break: Hero's/Rich Text's *own* independent preset choice (Sections
changing doesn't move Hero or Rich Text - they stay separately editable, just
now sharing the same underlying rem scale with no extra multiplier on top);
surface/spacing controls (untouched); `sectionScale` (Sections' *Spacing*
sibling field, a genuine density multiplier for vertical padding - stays
exactly as-is, this fix only touches width).

### Build steps

**Step 1 - Settings schema + width tokens**

- `src/globals/Settings/config.ts`: rename `containerScale` -> `sectionsWidth`,
  switch its `options` to `WIDTH_OPTIONS` (import already present), change
  `defaultValue` to `'default'`, and reword its description to match Header/
  Hero/Rich Text's phrasing ("Sets the width of every section, site-wide" -
  drop "Scales").
- `src/app/(frontend)/layout.tsx`: rename the `data-container-scale` attribute
  to `data-sections-width`, reading `settings.sectionsWidth ?? 'default'`.
- `src/globals/Settings/Component/SettingsLivePreviewSync.tsx`: rename the
  `containerScale` destructured value and its effect to `sectionsWidth` /
  `data-sections-width`, update the file's own doc comment listing the synced
  attributes.
- `src/app/(frontend)/styles/base/_alias-tokens.css`:
  - Remove the `--container-scale` token and its three
    `html[data-container-scale='...']` rules (the "Container width scale"
    section).
  - Add a new "Section width" section with the same shape as "Hero width /
    spacing"'s width half: `--section-max-width` on `:root` (114rem default)
    plus `html[data-sections-width='narrow'|'default'|'wide'|'full']` rules
    (72rem / 114rem / 144rem / `none`).
  - Drop the `* var(--container-scale, 1)` multiplication from every
    `--hero-max-width` and `--rich-text-max-width` rule, leaving the plain
    literal (`144rem` etc.).
- `src/components/primitives/_section.css`:
  - Generic `.ui-container[data-width='narrow'|'default'|'wide'|'full']`
    rules (used directly by Header, which passes `headerWidth` straight into
    `Container`'s own `width` prop with no wrapper class) lose the
    `* var(--container-scale, 1)` multiplication and become the plain literal
    values.
  - Add a `.ui-section-container.ui-container[data-width]` override (same
    2-class + attribute-presence specificity trick as
    `.ui-hero-container`/`.ui-rich-text-container` just above it) reading
    `var(--section-max-width)`, plus a matching
    `html[data-sections-width='full'] .ui-section-container.ui-container[data-width] { padding-inline: 0; }`
    rule, mirroring the Hero/Rich Text `full` rules right below it.
- `npm run generate:types` (Settings schema changed).

Done when: Settings/Whitespace shows "Sections -> Width" with the same four
options as Header/Hero/Rich Text, and the four groups' underlying rem values
match (verified in step 2's browser check).

**Step 1 status: done.** Schema renamed, tokens rewritten, `generate:types`
run clean.

**Step 2 - apply the new Sections width to every regular block**

Add `className="ui-section-container"` to the `<Container>` call in each of:

- `src/blocks/FeatureGrid/Component.tsx`
- `src/blocks/Table/Component.tsx`
- `src/globals/Footer/Component/FooterClient.tsx`
- `src/app/(frontend)/blog/[slug]/PostClient.tsx` (the post header `<Section>`
  around line 38 - not the `ui-rich-text-container` one, which stays on the
  Rich Text preset)
- `src/app/(frontend)/blog/[slug]/page.tsx` (related posts container)
- `src/collections/Pages/blogBlocks/FeaturedPost/Component.tsx`
- `src/collections/Pages/blogBlocks/BlogListing/Component.tsx`

And for the three hardcoded call sites, replace the literal `width` prop with
the same `className="ui-section-container"` (removing `width="narrow"` /
`width="default"` entirely, since the new override class wins regardless of
`Container`'s own `data-width` value):

- `src/blocks/CallToAction/Component.tsx`
- `src/components/PostNavigation.tsx`
- `src/components/Breadcrumbs.tsx`

Done when: every block above renders at Settings' Sections width, Header/
Hero/Rich Text still resolve independently, and setting all four Whitespace
groups to "Wide" produces the same visual max-width across the header, a
Hero block, a FeatureGrid, the Rich Text block, and the footer.

**Step 2 status: done.** `className="ui-section-container"` added to every
non-Hero/Header/Rich-Text `<Container>` call site; the three hardcoded
`width` props removed. `npm run lint` clean (only pre-existing, unrelated
warnings).

## Verify

- In the admin, set `Settings -> Whitespace -> Sections -> Width` to each of
  Narrow/Default/Wide/Full Screen and confirm FeatureGrid, a Call To Action
  block, the footer, and the blog post header all resize together.
- Set Header/Hero/Rich Text width independently from Sections and confirm
  they don't move when Sections changes (and vice versa).
- Set all four groups to "Wide" and confirm the header bar, a Hero block, a
  regular section, and the Rich Text block all line up to the same max-width
  (144rem) in the browser inspector.
- Set Sections to "Full Screen" and confirm a FeatureGrid/CallToAction/Footer
  goes edge-to-edge with no side padding, same as Hero/Rich Text already do
  at "Full Screen".

## Checks run

- `npm run lint` - clean (4 pre-existing warnings, unrelated to this change)
- `npm run build` - compiled successfully
