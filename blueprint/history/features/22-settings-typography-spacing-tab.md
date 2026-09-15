# Current Feature

**Title:** Settings typography/spacing tab
**Type:** Feature (build-plan item 22)
**Status:** verified
**Branch:** `feature/settings-typography-spacing-tab`

## Goal

Give editors a new **Typography** tab on the `Settings` global with four
site-wide controls, following the exact same field -> `data-*` attribute on
`<html>` -> CSS custom property pattern already shipped for Corners, Shadows,
and Colors (see the "Lock" note in `blueprint/context/project-overview.md`'s
Settings data model section):

- **Heading Font** and **Body Font** - pick which of the site's three
  preloaded fonts (`--font-primary`/`-secondary`/`-tertiary`, i.e. Montserrat/
  Vollkorn/Doto, already loaded via `next/font` in `fonts.ts`) headings and
  body text use.
- **Heading Scale** - a Compact/Default/Bold preset that scales every heading
  size (h1-h6) up or down together, site-wide.
- **Container Width** - a Compact/Default/Wide preset that scales the site's
  existing per-block container-width presets up or down together.

**Extended scope (revised during implementation, before `/complete`):** two
follow-up additions requested after the original four controls shipped and
were verified (steps 1-5 below):

- **A new Whitespace Settings tab** - Container Width moves out of Typography
  into this new tab, joined by a new site-wide multiplier, **Section
  Spacing** (layers on top of every block's existing per-block Tight/Normal/
  Loose spacing pick). A third control, **Container Gutter**, was built and
  then removed at the user's request (step 19) - the container's horizontal
  edge padding stays the fixed, non-editable `2rem`/`4rem` it always was.
- **Per-instance Display heading size** - a `headingDisplaySize` field
  (Default + 3 larger Display sizes), added independently to the Hero block
  and the blog post title (steps 14-18), then **fully undone** at the user's
  explicit request (step 31) - `headingDisplaySize` no longer exists
  anywhere, `Heading.tsx`'s `size` prop is back to `1|2|3|4|5|6` only, and
  the 3 `ui-heading-display-*` utilities plus their 9 backing tokens are
  removed. Both `<Heading level={1}>` call sites (Hero, Post title) are back
  to plain, no `size` prop.

**Second extension (revised again during implementation, before
`/complete`):** the user decided consistent width/spacing across a page's
sections is better design than per-block flexibility, with rich text as the
one deliberate exception (a narrower column reads better). Per-block
`width`/`spacing` (the two non-`surface` fields in the shared
`appearanceField()`/`breadcrumbsField()`) are removed everywhere; two new
site-wide pairs replace them for the two cases that still warrant a
deliberate choice - **Hero Width/Spacing** and **Rich Text Width/Spacing**
(the latter drives both the `RichTextBlock` page-builder block and a Post's
own body section, two independent rendering paths sharing one Settings
source, matching how `--heading-scale` already drives both `_heading.css`
and `_prose.css`). Every other block/section (FeatureGrid, CallToAction,
Table, both blog-only blocks, Footer, Post's own header/breadcrumbs) falls
back to a fixed default - no editor control, no Settings control.

Investigation surfaced a real constraint that shaped the mechanism: `Hero`
and `RichTextBlock` render inside `PageClient.tsx`/`PostClient.tsx`, both
`'use client'` (required for live preview), so they cannot become `async`
Server Components to fetch Settings directly - that would break the client
bundle. The two new pairs instead reuse the exact same
field -> `data-*`-on-`<html>` -> CSS-cascade pattern every other control in
this feature already uses, with a marker class + specificity-safe override
selector on Hero's/Rich Text's own `<Section>`/`<Container>`, so Hero/
RichTextBlock need zero data-fetching changes at all.

## In scope

- A new **Typography** tab on `src/globals/Settings/config.ts`, with
  `headingFont`, `bodyFont`, `headingScale` (as originally built).
- A new **Whitespace** tab (after Typography) with two fields:
  - `containerScale` (label "Container Width", options Compact(`sm`)/
    Default(`md`)/Wide(`lg`)) - **moved** from Typography, unchanged.
  - `sectionScale` (label "Section Spacing", options Compact(`sm`)/
    Default(`md`)/Loose(`lg`)) - new. Layers on top of the existing per-block
    `spacing` field (`tight`/`normal`/`loose`, from `appearanceField()`/
    `breadcrumbsField()`), same relationship `containerScale` already has
    with Container's per-block `width` pick.
  - A third field, `containerGutterScale` ("Container Gutter"), was added in
    steps 7/8/11/12/13 and then fully removed in step 19 at the user's
    request - see that step for what was reverted.
- Shared `--scale-sm: 0.85` / `--scale-md: 1` / `--scale-lg: 1.15` tokens in
  `_base-tokens.css` (already built for Heading Scale/Container Width), reused
  by the new `sectionScale` field - no new literals needed.
- New `--section-scale` cascade in `_alias-tokens.css`, switched by a
  `data-*` attribute on `<html>`, mirroring the existing cascades exactly.
- Wiring `<html>` in `layout.tsx` with 1 more `data-*` attribute
  (`data-section-scale`).
- Applying `--section-scale` to **both** of the project's independent
  section-spacing cascades:
  - `_section.css`'s `.ui-section[data-spacing='tight'/'normal'/'loose']`
    rules (not `'none'` - scaling 0 is meaningless).
  - `_footer.css`'s parallel `.footer[data-spacing='tight'/'normal'/'loose']`
    rules - `_footer.css` does not render through `<Section>` and hand-rolls
    its own copy of this cascade (its own comment says it "intentionally
    mirrors `_section.css`'s"); without this, Section Spacing would visibly
    scale every block and Breadcrumbs but silently skip the Footer.
- Syncing all 5 Typography+Whitespace fields during live preview in
  `SettingsLivePreviewSync.tsx` (4 already built, 1 new).
- A new `headingDisplaySize` select field (`'default'` (default) |
  `'display-sm'` | `'display-md'` | `'display-lg'`, labels Default/Display
  Small/Display Medium/Display Large), added to:
  - `src/blocks/Hero/config.ts` - new top-level field, after `heading`.
  - `src/collections/Posts/config.ts` - same field, nested inside the
    existing `headerAppearance` group (alongside that group's other
    appearance controls), **not** added to `bodyAppearance` and **not**
    added to the shared `appearanceField()` helper itself (used by
    CallToAction, Table, Footer, Breadcrumbs, `bodyAppearance` - none of
    which should get this field).
- Extending `Heading.tsx`'s existing `size` prop (already independent of
  `level` - the same mechanism `FeatureGrid`'s card titles already use) with
  3 new values (`'display-sm'|'display-md'|'display-lg'`) mapped to 3 new
  `ui-heading-display-*` utility classes in `_heading.css`.
- 9 new tokens in `_base-tokens.css`
  (`--text-display-sm/-md/-lg-mobile/-tablet/-desktop`), desktop values
  reusing the project's existing-but-currently-unused `--text-7xl`/`-8xl`/
  `-9xl` literals (`7.2rem`/`9.6rem`/`12.8rem`) as their own independent
  literals; mobile/tablet interpolated at the same ~0.6x/~0.8x-of-desktop
  ratio the existing h1-h3 scale uses, rounded to the file's 0.2rem
  granularity:

  | Token | mobile | tablet | desktop |
  |---|---|---|---|
  | `--text-display-sm-*` | `4.4rem` | `5.8rem` | `7.2rem` |
  | `--text-display-md-*` | `5.8rem` | `7.6rem` | `9.6rem` |
  | `--text-display-lg-*` | `7.6rem` | `10.2rem` | `12.8rem` |

  The 3 new `ui-heading-display-*` utilities compose multiplicatively with
  `--heading-scale` (not bypassing it), same `calc()` pattern as `ui-heading-1`
  - deliberate, so "Display is always bigger than a default h1" holds at
  every Heading Scale setting, and Heading Scale = Bold also nudges a
  Display-sized Hero title up, matching what an editor would expect.
- Wiring `headingDisplaySize` into `Hero/Component.tsx` and
  `blog/[slug]/PostClient.tsx`: `<Heading level={1} size={headingDisplaySize && headingDisplaySize !== 'default' ? headingDisplaySize : undefined}>`.
- Running `npm run generate:types` after each Settings/Hero/Posts field
  addition.

- Removing the `spacing`/`width` selects from `appearanceField()`'s and
  `breadcrumbsField()`'s row in `src/fields/appearance.ts`, keeping `surface`
  and (for breadcrumbs) `show`. Keeping `WIDTH_OPTIONS`/`SPACING_OPTIONS`
  exported for reuse by the two new Settings fields.
- Four new `select` fields on the Whitespace tab: `heroWidth`
  (`defaultValue: 'default'`), `heroSpacing` (`defaultValue: 'normal'`) -
  both matching Hero's own prior behavior exactly; `richTextWidth`
  (`defaultValue: 'narrow'`) - a deliberate visual change for Post body
  content (previously `'default'`/114rem), matching `RichTextBlock`'s own
  prior `'narrow'` fallback and the readability rationale behind this whole
  change; `richTextSpacing` (`defaultValue: 'normal'`).
- Four new token cascades in `_alias-tokens.css`
  (`--hero-max-width`/`--hero-space`/`--rich-text-max-width`/
  `--rich-text-space`), unlayered like the existing scale cascades, each
  composing with `--container-scale`/`--section-scale` the same way the
  generic rules already do.
- Four new **layered** (`@layer components`, matching `_section.css`'s own
  layer) override rules in `_section.css`, immediately after the generic
  rules they override, each using a marker class + attribute-presence
  selector for specificity guaranteed to beat the generic rule regardless of
  source order (e.g. `.ui-hero-container.ui-container[data-width] { max-width: var(--hero-max-width); }`).
  Plain specificity alone is not enough here - an unlayered override would
  "work" but make Hero/Rich Text width unoverridable by any future utility
  class, breaking the invariant `_section.css`'s own comment documents.
- Marker classes (`ui-hero-section`/`ui-hero-container`,
  `ui-rich-text-section`/`ui-rich-text-container`) added to Hero's own
  `<Section>`/`<Container>`, `RichTextBlock`'s own `<Section>`/`<Container>`,
  and `PostClient.tsx`'s `bodyAppearance` `<Section>`/`<Container>`.
- 4 new `data-*` attributes on `<html>` in `layout.tsx`, and 4 new
  `useEffect`/`setAttribute` pairs in `SettingsLivePreviewSync.tsx`.
- Removing `spacing`/`width` (destructure + prop-pass) from every consumer
  that loses per-instance control: `FeatureGrid`, `Table`,
  `BlogListing`/`FeaturedPost` (blog-only blocks), `FooterClient.tsx`,
  `Breadcrumbs.tsx` (+ its call site in `PostClient.tsx`), and
  `PostClient.tsx`'s `headerAppearance` group specifically (labeled "Hero
  section" in the admin, but NOT the Hero block - it falls back to a fixed
  default, it does **not** get wired to the new Hero Settings pair).
  `CallToAction` is the one exception: its own non-standard `?? 'tight'`/
  `?? 'narrow'` fallbacks become literal hardcoded values (not the generic
  `'normal'`/`'default'`), preserving its deliberately different look.
- Running `npm run generate:types` after the field changes, and using the
  resulting TypeScript errors as the completeness check for every stale
  `spacing`/`width` consumer (rather than relying on grep alone).

## Out of scope

- **Container Gutter control** - built in steps 7/8/11/12/13 (a
  `containerGutterScale` Settings field scaling `.ui-container`'s horizontal
  edge padding), then fully removed in step 19 at the user's explicit
  request. The container gutter stays the fixed, non-editable `2rem`/`4rem`
  it always was; not reintroduced.
- **Per-instance Display heading size** - built in steps 14-18
  (`headingDisplaySize` on Hero and Post's `headerAppearance`, 3
  `ui-heading-display-*` utilities, 9 backing tokens, `Heading.tsx`'s `size`
  prop widened), then fully removed in step 31 at the user's explicit
  request. `Heading`'s `size` prop is back to `1|2|3|4|5|6` only; not
  reintroduced.
- Any new Google Font or arbitrary font upload.
- Per-block or per-heading-level overrides for Heading Font/Body Font/
  Heading Scale - those three stay single site-wide settings.
- `Subheading` (`_subheading.css`'s `ui-subheading` utility) - unrelated to
  the h1-h6 heading system.
- Changing what each block's own Width picker
  (`narrow`/`default`/`wide`/`full`) does, or the per-block Spacing picker
  (`none`/`tight`/`normal`/`loose`) - both stay editor-controlled per
  instance; the new Whitespace tab only scales the pixel values those
  presets resolve to.
- `--header-height-*` in `_base-tokens.css` - already directly
  editor-selectable via the Header global's own `height` field (a direct
  enum pick, not a scale multiplier), confirmed a poor fit for this pattern;
  not touched.
- Raw component-CSS gap/padding literals in Header/Footer chrome, Card,
  PostPreview, PostNavigation, Pagination, CategoryFilter, Breadcrumbs,
  Table, and button padding - none reference a shared token today, so none
  are in scope for a multiplier; would require a separate tokenization pass
  first.
- `Stack`'s per-call gap tier (`sm`/`md`/`lg`) - hardcoded per block
  call-site by the block author today, not an editor-facing field at any
  level; making it editor-controlled is a separate, larger change.
- The base `--spacing: 0.4rem` master multiplier - would only affect
  Tailwind-utility-driven spacing and silently miss the many raw-literal CSS
  rules listed above, an inconsistent partial effect; not a good "site-wide
  whitespace" control.
- Fixing the pre-existing multi-`<h1>` possibility (a page/post can contain
  multiple Hero instances, each independently a `level={1}`) - orthogonal to
  heading size, not touched.
- Access control changes - `Settings`/`Hero`/`Posts` have no relevant new
  `access` rules; all new fields inherit each collection/global's existing
  write path.
- A Settings-level control for Post's own `headerAppearance` ("Hero
  section") - explicitly declined; it falls back to a fixed default like
  every other now-uncontrolled block, per the user's confirmed answer.
- `surface` on any block/section - untouched everywhere; only `spacing`/
  `width` are being removed as per-instance fields.
- Prop-threading Settings through `page.tsx`/`blog/[slug]/page.tsx` ->
  `PageClient`/`PostClient` -> `Blocks`/`RichText` converters -> `Hero`/
  `RichTextBlock` - considered and rejected in favor of the CSS-cascade
  mechanism, which needs no changes to that data-fetching chain at all.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement and verify each step below in
order without pausing for approval between them, keeping the project working
after every step, then stop and present one review packet with the complete
diff and each step's Done-when evidence before `/complete`. No checkpoint
commits.

## Build steps

- [x] 1. **Add the four fields to `Settings` and regenerate types.** Add a
  new "Typography" tab to `src/globals/Settings/config.ts` (after the
  "Colors" tab) with `headingFont`, `bodyFont`, `headingScale`,
  `containerScale` as described in In scope. Run `npm run generate:types`.
  **Done when:** `payload-types.ts`'s `Setting` type includes all four new
  fields with the correct string-literal unions.

- [x] 2. **Add the shared scale tokens and wire the four cascades.** Add the
  `--scale-sm`/`--scale-md`/`--scale-lg` tokens to `_base-tokens.css`. Add
  the `--font-heading`/`--font-body`/`--heading-scale`/`--container-scale`
  cascades to `_alias-tokens.css`, each keyed off a `data-*` attribute on
  `<html>`. Set the four new `data-*` attributes on `<html>` in
  `layout.tsx`, defaulted with `??` the same way the existing five are.
  **Done when:** `npm run build` passes, and in the browser, viewing page
  source shows all four new `data-*` attributes on `<html>` reflecting
  Settings' current values (defaults, before any edit).

- [x] 3. **Apply the font and heading-scale tokens to every consumer.**
  Update `_reset.css`'s `body` rule, `_heading.css`'s six `ui-heading-N`
  utilities, and `_prose.css`'s `h1`/`h2`/`h3`/`h4,h5,h6` rules as described
  in In scope. **Done when:** `npm run build` and `npm run lint` pass, and in
  the browser: changing Settings -> Typography -> Heading Font updates every
  `<Heading>`-rendered heading (e.g. a Hero heading, a blog post title) AND
  a rich-text body heading together; changing Body Font updates paragraph
  text but not headings; changing Heading Scale visibly resizes headings in
  both places together, at every breakpoint.

- [x] 4. **Apply the container-scale token to `_section.css`.** Multiply
  each of the three non-`full` `.ui-container[data-width='...']` rules'
  `max-width` by `var(--container-scale, 1)`. **Done when:** `npm run build`
  and `npm run lint` pass, and in the browser: changing Settings ->
  Typography -> Container Width visibly widens/narrows a Narrow, Default,
  and Wide container together (e.g. a Hero set to each width in turn), while
  a Full-width block's edge-to-edge layout is unchanged.

- [x] 5. **Sync all four fields during live preview.** Destructure
  `headingFont`, `bodyFont`, `headingScale`, `containerScale` from the
  existing `useScopedLivePreview<Setting>` call in
  `SettingsLivePreviewSync.tsx`, and add one `useEffect` per field calling
  `document.documentElement.setAttribute(...)`, matching the file's existing
  pattern. **Done when:** `npm run build` passes, and with Settings open in
  the admin's live preview pane, changing any of the four Typography fields
  updates the previewed page instantly, with no save required.

- [x] 6. **Add the "Whitespace" tab and relocate `containerScale`.** In
  `src/globals/Settings/config.ts`, add a new tab labeled "Whitespace" after
  "Typography". Cut `containerScale`'s field object out of the Typography
  tab's `fields` array and paste it, unmodified, into Whitespace's.
  **Done when:** `npm run build` passes; in `/admin`, "Container Width" no
  longer appears under Typography and now appears under a new Whitespace
  tab, with its saved value preserved.

- [x] 7. **Add `sectionScale` and `containerGutterScale` fields.** Add both
  to the Whitespace tab as described in In scope (same `select` shape as
  `headingScale`/`containerScale`). Run `npm run generate:types`.
  **Done when:** `payload-types.ts`'s `Setting` type includes both new
  fields; both render in `/admin` with correct labels/options/defaults.

- [x] 8. **Add the two new cascades to `_alias-tokens.css`.** `--section-scale`
  and `--container-gutter-scale`, each resolving `html[data-section-scale=...]`/
  `html[data-container-gutter-scale=...]` to the shared `--scale-sm/-md/-lg`
  tokens, `:root` default `md`, matching the existing cascade blocks' style.
  **Done when:** `npm run build` passes.

- [x] 9. **Wire `_section.css`'s section-spacing rules to `--section-scale`.**
  Wrap the `tight`/`normal`/`loose` `--section-space` values in
  `calc(var(--space-section-X) * var(--section-scale, 1))`; leave `none` at
  `0rem`. **Done when:** `npm run build` and `npm run lint` pass, and in the
  browser, a block set to Loose spacing visibly grows when Settings ->
  Whitespace -> Section Spacing is set to Loose.

- [x] 10. **Wire `_footer.css`'s matching spacing rules the same way.** Wrap
  `--footer-space`'s `tight`/`normal`/`loose` values in the identical
  `calc(... * var(--section-scale, 1))`; leave `none` alone. **Done when:**
  `npm run build` and `npm run lint` pass, and in the browser, the Footer's
  vertical padding also responds to Section Spacing (closing the gap step 9
  alone would leave).

- [x] 11. **Convert `.ui-container`'s gutter to `--container-gutter-scale`.**
  Replace `padding-inline: 2rem; @apply atMedium:px-[4rem];` with
  `padding-inline: calc(2rem * var(--container-gutter-scale, 1));` plus a
  plain `@media (width >= theme(--breakpoint-atMedium)) { padding-inline: calc(4rem * var(--container-gutter-scale, 1)); }`,
  leaving `[data-width='full']`'s `padding-inline: 0` untouched. **Done
  when:** `npm run build` and `npm run lint` pass; in the browser inspector,
  a non-full container's computed `padding-inline` scales with Container
  Gutter, while a Full-width container's stays `0` regardless of the
  setting.

- [x] 12. **Wire the 2 new `data-*` attributes in `layout.tsx`.** Add
  `data-section-scale={settings.sectionScale ?? 'md'}` and
  `data-container-gutter-scale={settings.containerScale ?? 'md'}`
  (default `'md'`) to `<html>`, alongside the existing 6. **Done when:**
  `npm run build` passes; view-source on a fresh SSR page shows both new
  attributes with the correct default/saved value.

- [x] 13. **Sync the 2 new fields during live preview.** Destructure
  `sectionScale`/`containerGutterScale` in `SettingsLivePreviewSync.tsx`,
  add two more `useEffect`/`setAttribute` pairs. **Done when:** `npm run
  build` passes; dragging Section Spacing / Container Gutter in the
  Settings live-preview pane updates the preview instantly.

- [x] 14. **Add the 9 new Display tokens to `_base-tokens.css`.** The 9
  `--text-display-sm/-md/-lg-mobile/-tablet/-desktop` tokens and values from
  In scope's table, grouped under Typography with a comment cross-referencing
  `--text-7xl/-8xl/-9xl` as the desktop anchor. **Done when:** `npm run
  build` passes.

- [x] 15. **Add the 3 new `ui-heading-display-*` utilities to
  `_heading.css`.** Structurally identical to `ui-heading-1` (font-weight,
  `font-family: var(--font-heading, ...)`, responsive `calc(... *
  var(--heading-scale, 1))` via the plain-`@media` pattern already used
  there). **Done when:** `npm run build` and `npm run lint` pass; applying
  each class directly (e.g. via browser inspector) produces the expected
  computed `font-size` at all three breakpoints, and changing Settings ->
  Typography -> Heading Scale scales it too.

- [x] 16. **Extend `Heading.tsx`'s `size` prop and `SIZE` map** with
  `'display-sm' | 'display-md' | 'display-lg'` -> the 3 new utility classes.
  **Done when:** `npm run build` passes with no TypeScript error for
  `<Heading size="display-lg">`.

- [x] 17. **Add `headingDisplaySize` to `Hero/config.ts` and wire it in
  `Hero/Component.tsx`.** New top-level select field after `heading`
  (`defaultValue: 'default'`, 4 options as in In scope). Destructure in the
  component and pass the conditional `size` prop. Run `npm run
  generate:types`. **Done when:** `payload-types.ts`'s `HeroBlock` type
  includes `headingDisplaySize`; in the browser, a Hero set to each Display
  size in turn renders visibly larger than Default, still as an `<h1>`.

- [x] 18. **Add the same field to `Posts/config.ts` (nested in
  `headerAppearance`) and wire it in `PostClient.tsx`.**
  `fields: [...appearanceField(), { name: 'headingDisplaySize', ... }]` on
  the `headerAppearance` group only - not `bodyAppearance`, not the shared
  `appearanceField()` helper. Destructure `data.headerAppearance?.headingDisplaySize`
  in `PostClient.tsx` and pass the same conditional `size` prop. Run `npm
  run generate:types`. **Done when:** `payload-types.ts`'s `Post` type shows
  `headingDisplaySize` nested under `headerAppearance`; the field appears
  only under Post -> Appearance -> Hero section in `/admin` (Table/
  CallToAction/Footer/bodyAppearance UIs unchanged); in the browser, a post
  set to a Display size renders its title visibly larger than Default, and
  the post's live preview updates it with no reload.

- [x] 19. **Remove the Container Gutter control**, at the user's request.
  Delete the `containerGutterScale` field from `Settings/config.ts`'s
  Whitespace tab (added in step 7). Delete the `--container-gutter-scale`
  cascade from `_alias-tokens.css` (added in step 8). Revert
  `.ui-container`'s `padding-inline` in `_section.css` back to its original
  plain `2rem` + `@apply atMedium:px-[4rem]` form (undoing step 11 - no more
  reason for the plain-`@media` workaround once there's no scale to multiply
  by). Remove `data-container-gutter-scale` from `<html>` in `layout.tsx`
  (added in step 12). Remove the `containerGutterScale` destructure and its
  `useEffect` from `SettingsLivePreviewSync.tsx` (added in step 13). Run
  `npm run generate:types`. **Done when:** `payload-types.ts`'s `Setting`
  type no longer includes `containerGutterScale`; `grep -rn
  "containerGutterScale|container-gutter-scale" src` returns no results;
  `npm run build` and `npm run lint` pass; "Container Gutter" no longer
  appears under Settings -> Whitespace in `/admin`.

- [x] 20. **Strip `spacing`/`width` from the shared field factories.** In
  `src/fields/appearance.ts`, remove the `spacing`/`width` selects from
  `appearanceField()`'s row (keep `surface`) and from `breadcrumbsField()`'s
  row (keep `show`/`surface`). Keep `WIDTH_OPTIONS`/`SPACING_OPTIONS`
  exported. **Done when:** the file compiles; `appearanceField()`/
  `breadcrumbsField()` each return only `surface` (+ `show` for
  breadcrumbs).

- [x] 21. **Add the 4 new Settings fields and regenerate types.** Add
  `heroWidth`/`heroSpacing`/`richTextWidth`/`richTextSpacing` to the
  Whitespace tab in `Settings/config.ts`, reusing `WIDTH_OPTIONS`/
  `SPACING_OPTIONS`, with the defaults from In scope. Run `npm run
  generate:types`. **Done when:** `payload-types.ts` shows the 4 new
  `Setting` fields; the same command's TypeScript errors enumerate every
  stale `spacing`/`width` consumer across the codebase (expected at this
  point - resolved in steps 26-29).

- [x] 22. **Add the 4 new token cascades to `_alias-tokens.css`.**
  `--hero-max-width`/`--hero-space`/`--rich-text-max-width`/
  `--rich-text-space`, each composing with `--container-scale`/
  `--section-scale`, `:root` defaults matching each field's `defaultValue`
  (`--rich-text-max-width` defaults to the `'narrow'`/72rem value). **Done
  when:** `npm run build` passes.

- [x] 23. **Add the 4 marker-class override rules to `_section.css`.**
  Immediately after their respective generic rules, inside the file's
  existing `@layer components`: `.ui-hero-container.ui-container[data-width]`,
  `.ui-hero-section.ui-section[data-spacing]`,
  `.ui-rich-text-container.ui-container[data-width]`,
  `.ui-rich-text-section.ui-section[data-spacing]`. Handle the `'full'`
  width case for both (padding-inline collapses to 0), matching the
  generic `[data-width='full']` rule's behavior. **Done when:** `npm run
  build` and `npm run lint` pass.

- [x] 24. **Wire the 4 new `data-*` attributes in `layout.tsx`.** **Done
  when:** `npm run build` passes; view-source shows all 4 attributes on
  `<html>` with correct default/saved values.

- [x] 25. **Sync the 4 new fields in `SettingsLivePreviewSync.tsx`.** **Done
  when:** `npm run build` passes; changing any of the 4 fields in Settings'
  live-preview pane updates instantly.

- [x] 26. **Update `Hero/Component.tsx`.** Drop `spacing`/`width` from the
  destructure and the props passed to `<Section>`/`<Container>`; add
  `className="ui-hero-section"` to `<Section>`, fold `'ui-hero-container'`
  into `<Container>`'s existing conditional-className array (not a second
  static string bolted on). **Done when:** `npm run build` passes with no
  TypeScript error; in the browser, a Hero's width/spacing responds only to
  Settings -> Whitespace -> Hero Width/Spacing, at every value including
  Full.

- [x] 27. **Update `RichTextBlock/Component.tsx`.** Same treatment
  (including dropping the old `width ?? 'narrow'` divergence - the new
  `--rich-text-max-width` default now carries that intent). **Done when:**
  `npm run build` passes; a RichTextBlock's width/spacing responds only to
  Settings -> Whitespace -> Rich Text Width/Spacing.

- [x] 28. **Update `PostClient.tsx`.** Apply the Rich Text marker classes to
  the `bodyAppearance` `<Section>`/`<Container>` pair. Strip `spacing`/
  `width` from the `headerAppearance` pair (falls back to `Section`/
  `Container`'s own defaults - NOT wired to Hero's Settings pair) and from
  the `<Breadcrumbs>` call. **Done when:** `npm run build` passes; a Post's
  body width/spacing responds to Settings -> Whitespace -> Rich Text
  Width/Spacing (confirming the two-consumer share works); the post header
  and breadcrumbs render at a fixed default regardless of any Settings
  value.

- [x] 29. **Hardcode defaults in every remaining consumer.** Delete the now-dead
  `spacing`/`width` destructure and props in `FeatureGrid`, `Table`,
  `BlogListing/Component.tsx`, `FeaturedPost/Component.tsx`, and
  `FooterClient.tsx` (letting `Section`/`Container`'s own defaults apply).
  In `CallToAction/Component.tsx`, replace `spacing ?? 'tight'`/
  `width ?? 'narrow'` with literal `'tight'`/`'narrow'`. In `Breadcrumbs.tsx`,
  remove `spacing`/`width` from `BreadcrumbsProps` (and the now-unused
  `Spacing`/`Width` type imports), hardcoding `spacing="tight"` and
  `width="default"` directly in its JSX. **Done when:** `npm run build` and
  `npm run lint` pass with zero TypeScript errors; every one of these
  blocks/sections renders unchanged from before this step (visually
  identical to their pre-removal default appearance).

- [x] 30. **Final verification pass.** `grep -rn "\.spacing\b\|\.width\b"` across
  block/collection config and component files to confirm no stray consumer
  survived the TypeScript check; `npm run build`, `npm run lint`, `npm run
  generate:types` all clean. **Done when:** all three pass and the grep
  shows no remaining per-instance `spacing`/`width` consumer outside Hero/
  RichTextBlock/PostClient's new marker-class usage.

- [x] 31. **Fully undo the Display heading size feature**, at the user's
  request. Remove `headingDisplaySize` from `Hero/config.ts` and its wiring
  from `Hero/Component.tsx` (back to plain `<Heading level={1}>`). Remove it
  from `Posts/config.ts`'s `headerAppearance` group (back to
  `fields: appearanceField()`) and its wiring from `PostClient.tsx` (back to
  plain `<Heading level={1}>`). Revert `Heading.tsx`'s `size` prop/`SIZE` map
  to `1|2|3|4|5|6` only. Remove the 3 `ui-heading-display-*` utilities from
  `_heading.css`. Remove the 9 `--text-display-*` tokens from
  `_base-tokens.css`. Run `npm run generate:types`. **Done when:**
  `payload-types.ts` no longer has `headingDisplaySize` anywhere; `grep -rn
  "headingDisplaySize|display-sm|display-md|display-lg|text-display" src`
  returns no results; `npm run build`, `npm run lint`, and a full `next
  build` (real typecheck) all pass with no new errors.

## Files / areas

- `src/globals/Settings/config.ts` - edit (Typography tab; Whitespace tab
  added, `containerScale` relocated into it, `sectionScale` added;
  `containerGutterScale` added then removed)
- `src/app/(frontend)/styles/base/_base-tokens.css` - edit (`--scale-sm/-md/
  -lg`; 9 new `--text-display-*` tokens)
- `src/app/(frontend)/styles/base/_alias-tokens.css` - edit (5 cascades:
  font-heading, font-body, heading-scale, container-scale, section-scale;
  container-gutter-scale added then removed)
- `src/app/(frontend)/styles/base/_reset.css` - edit (`body` font-family)
- `src/app/(frontend)/styles/elements/_heading.css` - edit (6 `ui-heading-N`
  utilities; 3 new `ui-heading-display-*` utilities)
- `src/app/(frontend)/styles/elements/_prose.css` - edit (rich-text h1-h6)
- `src/components/primitives/_section.css` - edit (container max-width;
  section spacing; container gutter added then reverted to its original form)
- `src/globals/Footer/Component/_footer.css` - edit (footer spacing, closes
  the gap from step 10)
- `src/components/primitives/Heading.tsx` - edit (`size` prop/`SIZE` map)
- `src/blocks/Hero/config.ts` - edit (`headingDisplaySize` field)
- `src/blocks/Hero/Component.tsx` - edit (wire `headingDisplaySize`)
- `src/collections/Posts/config.ts` - edit (`headingDisplaySize` nested in
  `headerAppearance`)
- `src/app/(frontend)/blog/[slug]/PostClient.tsx` - edit (wire
  `headingDisplaySize`)
- `src/app/(frontend)/layout.tsx` - edit (5 `data-*` attributes total;
  `data-container-gutter-scale` added then removed)
- `src/globals/Settings/Component/SettingsLivePreviewSync.tsx` - edit (5
  synced fields total; `containerGutterScale` added then removed)
- `src/payload-types.ts` - regenerated by `npm run generate:types`, not
  hand-edited

Also edited for this extension: `src/fields/appearance.ts`, `src/blocks/Hero/Component.tsx`,
`src/blocks/RichTextBlock/Component.tsx`, `src/blocks/FeatureGrid/Component.tsx`,
`src/blocks/CallToAction/Component.tsx`, `src/blocks/Table/Component.tsx`,
`src/collections/Pages/blogBlocks/BlogListing/Component.tsx`,
`src/collections/Pages/blogBlocks/FeaturedPost/Component.tsx`,
`src/globals/Footer/Component/FooterClient.tsx`, `src/components/Breadcrumbs.tsx`,
`src/app/(frontend)/blog/[slug]/PostClient.tsx`.

No new files.

## Data / contracts

Settings global (all optional `select` fields, `defaultValue` covers a
document with no stored value):

| Field | Label | Values | Default | CSS custom property |
|---|---|---|---|---|
| `headingFont` | Heading Font | `primary` \| `secondary` \| `tertiary` | `primary` | `--font-heading` |
| `bodyFont` | Body Font | `primary` \| `secondary` \| `tertiary` | `primary` | `--font-body` |
| `headingScale` | Heading Scale | `sm` \| `md` \| `lg` | `md` | `--heading-scale` |
| `containerScale` | Section Width (label renamed after building; field name/behavior unchanged) | `sm` \| `md` \| `lg` | `md` | `--container-scale` |
| `sectionScale` | Section Spacing | `sm` \| `md` \| `lg` | `md` | `--section-scale` |

`--heading-scale`/`--container-scale`/`--section-scale` all resolve to one of
the shared `--scale-sm` (`0.85`)/`--scale-md` (`1`)/`--scale-lg` (`1.15`)
tokens, applied via `calc(<existing-value> * var(--*-scale, 1))` at every
consumer. (`containerGutterScale`/`--container-gutter-scale` existed
transiently between steps 7-13 and were fully removed in step 19 - not part
of the final contract.)

~~New optional `headingDisplaySize` select field...~~ **Removed in step 31.**
`Hero` and `Post.headerAppearance` no longer have this field; `Heading`'s
`size` prop is back to `1|2|3|4|5|6` only. Not part of the final contract.

No new API route or access-control rule - every new field rides its existing
collection/global's default Payload REST/GraphQL/Local API surface.

`appearanceField()`/`breadcrumbsField()` drop `spacing`/`width` from their
returned fields - every collection/block consuming them loses those two
properties from its generated Payload type. Four new `select` fields on
`settings`: `heroWidth`/`richTextWidth` (`WIDTH_OPTIONS`: `narrow`|`default`|
`wide`|`full`), `heroSpacing`/`richTextSpacing` (`SPACING_OPTIONS`: `none`|
`tight`|`normal`|`loose`), defaults as in In scope.

**Data note:** any block instance that previously had a non-default
`spacing`/`width` value stored loses that customization on this change -
the field is removed from the schema, so Payload no longer reads or exposes
it, and every instance of every affected block renders at its new fixed
default (or, for Hero/Rich Text, whatever the site-wide Settings value is)
regardless of what was previously stored. This is the intended effect of
"remove per-block flexibility," not an oversight.

## Testing

No pure logic is introduced (select fields and CSS token wiring only), so
this stays unit-test-exempt per `coding-standards.md`'s testing scope rule,
matching Corners/Shadows/Colors/Typography precedent. Verify manually with
`npm run dev` via `/try` after implementation:

- Every Whitespace field (Section Width, Section Spacing) against a page
  using multiple blocks, Breadcrumbs, and the Footer visible together -
  confirm Section Spacing reaches the Footer, and Section Width correctly
  skips Full-width blocks.
- Confirm no trace of Container Gutter remains: not in `/admin`, no
  `padding-inline` change tied to any Settings value on a `.ui-container`.
- Confirm no trace of Display heading size remains: no "Heading Display
  Size" field on Hero or Post's Hero section in `/admin`; a Hero and a
  post title both render as plain `<h1>` with no `size` override.
- Confirm `npm run build`, `npm run lint`, and `npm run generate:types` all
  pass.
- Every block/section that lost its per-instance width/spacing (FeatureGrid,
  CallToAction, Table, both blog-only blocks, Footer, Post header,
  breadcrumbs) renders at its expected fixed default, unaffected by any
  Whitespace Settings value except `containerScale`/`sectionScale` (the
  general multipliers, which still apply since they key off `data-width`/
  `data-spacing`'s VALUE regardless of source).
- Hero Width/Spacing and Rich Text Width/Spacing each apply correctly at
  every option including Full/None, both for a top-level Hero/RichTextBlock
  and one embedded inside a Post's rich-text body (`BlocksFeature`).
- A Post's body content and a `RichTextBlock` elsewhere on the same page
  share one Rich Text Width/Spacing value from Settings (confirm both move
  together when the Settings value changes).

## Notes for the AI

- `_prose.css`'s heading rules are a second, independent consumer from
  `_heading.css` - rich text has no class hooks, so it's styled by raw
  element selector. Already wired in step 3; not touched again by steps
  6-18.
- `_footer.css` hand-rolls its own copy of the section-spacing cascade
  instead of sharing `_section.css`'s - both need the identical
  `--section-scale` wrap (steps 9 and 10), or Section Spacing will visibly
  skip the Footer.
- Reuse the three `--scale-*` tokens for every one of the three scale
  cascades (heading, container, section) rather than defining separate
  literals - they are the same conceptual 3-step density scale, applied to
  three different consumers.
- Container Gutter is gone (step 19) - do not reintroduce
  `containerGutterScale`/`--container-gutter-scale` or the plain-`@media`
  form of `.ui-container`'s base rule without a new explicit request.
- Do NOT make `Hero`/`RichTextBlock` `async` to fetch Settings directly -
  they are dispatched via `blockComponents` (`src/blocks/registry.ts`) into
  `PageClient.tsx`/`PostClient.tsx`'s client-rendered tree (and via
  `RichText`'s block converters), so an async component there breaks the
  client bundle. The CSS-cascade mechanism (steps 22-23) exists specifically
  to avoid this; do not revert to prop-threading Settings through the
  render tree without re-confirming this constraint no longer applies.
- The 4 new override rules in `_section.css` MUST stay inside
  `@layer components` (matching that file's and `_hero.css`'s existing
  convention) - an unlayered override would still "work" today but would
  make Hero/Rich Text width/spacing unoverridable by any `@layer utilities`
  class, silently breaking an invariant the file's own top comment
  documents as intentional.
- Post's `headerAppearance` group is labeled "Hero section" in the Payload
  admin but is NOT the Hero block - do not wire it to `heroWidth`/
  `heroSpacing`. It falls back to `Section`/`Container`'s own defaults, per
  the user's explicit answer.
- `CallToAction`'s hardcoded `'tight'`/`'narrow'` are that block's own
  deliberately different defaults (predating this change) - do not
  "correct" them to the generic `'normal'`/`'default'` used everywhere else.
- `containerScale`'s admin label was renamed from "Container Width" to
  "Section Width" after this spec was written - the field name
  (`containerScale`), CSS token (`--container-scale`), and behavior are all
  unchanged, only the editor-facing label text changed. Earlier text in this
  spec referring to "Container Width" describes the label as it was at the
  time each step was built; treat "Section Width" as the current name.
- `containerScale`/`sectionScale` are now labeled "Sections Width"/"Sections
  Spacing" (renamed again from "Section Width"/"Section Spacing") and wrapped
  in an unnamed `type: 'collapsible'` labeled "Sections" in the Whitespace
  tab. `heroWidth`/`heroSpacing` are wrapped in their own collapsible labeled
  "Hero"; `richTextWidth`/`richTextSpacing` in one labeled "Rich Text" - all
  three groups match the Colors tab's Primary/Secondary grouping pattern,
  purely presentational (unnamed collapsibles don't nest data - confirmed via
  `generate:types` that all six fields stay flat siblings on `Setting`).
- The Header global's own `width`/`height` fields (from
  `headerAppearanceField()`) moved to Settings too: two new fields,
  `headerWidth` (`WIDTH_OPTIONS`, `defaultValue: 'default'`) and
  `headerHeight` (Compact/Normal/Tall, `defaultValue: 'normal'`), matching
  the removed fields' exact prior options/defaults, wrapped in a fourth
  Whitespace collapsible labeled "Header". `headerAppearanceField()` keeps
  `surface`/`position`/`transparentAtTop`/`showThemeToggle` - only
  `width`/`height` moved.

  Mechanism differs from Hero/Rich Text and is simpler: `Header`
  (`src/globals/Header/Component/index.tsx`) is an async Server Component
  rendered directly from `layout.tsx` (`<Header />`), NOT dispatched through
  the client-rendered `blockComponents` registry the way `Hero`/
  `RichTextBlock` are - so it has no async/client-boundary constraint.
  `Header` now also fetches `settings` and passes it to `HeaderClient.tsx`,
  which adds a second `useScopedLivePreview<Setting>` call alongside its
  existing one for `Header`'s own data - the exact same two-hook pattern
  `FooterClient.tsx` already uses for `siteName`. No CSS changes needed at
  all: `data-height` and `<Container width={...}>` already consumed the
  value generically regardless of source, confirmed by reading `_header.css`
  before making the change.

  Whitespace tab collapsible order (per explicit request): **Header, Hero,
  Sections, Rich Text.**
- All 8 field descriptions in the Whitespace tab rewritten for consistency
  and precision: `Sets the [width/height/vertical spacing] of [what],
  site-wide` for the 6 direct-preset fields (Header Width/Height, Hero
  Width/Spacing, Rich Text Width/Spacing - each picks one absolute value:
  Narrow/Default/Wide/Full, Compact/Normal/Tall, or None/Tight/Normal/Loose);
  `Scales every section's [width/vertical spacing] up or down, site-wide`
  for `containerScale`/`sectionScale` specifically - kept a distinct
  template on purpose, since those two are genuinely a different mechanism
  (a multiplier applied on top of every section's already-fixed size, not
  a preset pick like the other six).
- All 8 field labels simplified to just "Width"/"Height"/"Spacing" (dropping
  the repeated group name - e.g. "Hero Width" -> "Width" inside the "Hero"
  collapsible), since the enclosing group already provides that context.
  Field names (`heroWidth`, `richTextSpacing`, etc.) and descriptions are
  unchanged - only the visible label text shortened.
- Sections' two fields' middle option renamed from "Default" to "Normal",
  then reverted back to "Default" at the user's explicit direction - every
  Spacing/Height field's middle option (`SPACING_OPTIONS`'s shared "Normal"
  label, and Header Height's own inline option) is now "Default" too, for
  full consistency with every Width field's middle option. Only the display
  label changed (`value: 'normal'` is unchanged everywhere, confirmed via
  `generate:types`) - not a data/behavior change.
- `containerScale`'s (Sections -> Width) smaller option relabeled from
  "Compact" to "Narrow", so it now fully matches Header/Hero/Rich Text
  Width's own vocabulary (Narrow/Default/Wide) despite being a different
  mechanism underneath (a 0.85x multiplier, not an absolute preset) - value
  stays `'sm'`, unchanged. Deliberately asymmetric with Spacing:
  `sectionScale` (Sections -> Spacing) keeps "Compact" rather than adopting
  Hero/Rich Text Spacing's "Tight", since "Compact" reads as "scale
  everything down a notch" while "Tight" reads as a specific absolute
  choice - confirmed with the user as intentional, not an oversight.
- `WIDTH_OPTIONS`'s largest option relabeled "Full bleed" -> "Full Screen"
  (value stays `'full'`) - shared by Header/Hero/Rich Text Width, so this one
  edit updated all three consistently.
- `appearanceField()`'s "Appearance" collapsible wrapper removed - it only
  ever wrapped `surface` after `width`/`spacing` moved out, so the extra
  click added no grouping benefit. Now returns a flat `surface` select
  directly. `headerAppearanceField()` (4 fields: surface/position/
  transparentAtTop/showThemeToggle) and `breadcrumbsField()` (2 fields:
  show/surface) both keep their collapsibles - neither is down to a single
  field. Confirmed via `generate:types` this is purely presentational: every
  consumer's generated type (`HeroBlock`, `FeatureGridBlock`, etc.) is
  unchanged - a nameless collapsible never nests data.
- Keep every new Settings field a flat sibling on the `settings` global (not
  nested in a `group`), matching existing fields.
- Do not touch `Container.tsx`'s `Width` prop/type, or the per-block
  `spacing` field's options - both site-wide scale controls are multipliers
  layered on top of those existing per-block pickers, not replacements.
- Display heading size is gone (step 31) - do not reintroduce
  `headingDisplaySize`, the `ui-heading-display-*` utilities, or the
  `--text-display-*` tokens without a new explicit request. `Heading`'s
  `size` prop is `1|2|3|4|5|6` only again.
- A page/post can still contain multiple Hero instances (Hero is embeddable
  inside Post body rich text, not just `Pages.blocks`) - unrelated to the
  removed feature, still true, not a bug.
