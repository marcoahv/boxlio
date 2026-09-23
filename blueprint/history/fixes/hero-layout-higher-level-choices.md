# Current Feature

> **Generated file.** Holds the one feature, fix, or rollback being built right now.

## Hero layout: consolidate to Text-only / Split / Media Background

**Type:** Fix

**Status:** verified

**Follow-up fix: `.header__controls`'s `--header-fg` override was inert.**
`.header` sets `color: var(--header-fg)` once at the root; everything below
just inherits that already-resolved `color` via `color: inherit`. The split
rule redefined the `--header-fg` *custom property* on `.header__controls`,
but nothing re-read `var(--header-fg)` into `color` at that point in the tree
- so the override never took effect for links/icons (the logo, a separate
image-swap mechanism, worked fine). Fixed by adding `color: var(--header-fg)`
directly to `.header__controls`'s own rule in `_header.css`, so it explicitly
re-consumes whatever `--header-fg` value is in scope there.

**Follow-up fix: Full-bleed media/overlay wrong size on mobile.** Reported as
"video dimensions don't work on mobile"; confirmed by the user to affect image
too, so not video-specific. Root cause: the overlay `<div>` was a separate
Section-level sibling reusing `fullBleedPositionClassName`, which is only
`position: absolute` from `atMedium` up - below that breakpoint both the media
and the overlay independently resolved to `position: relative`, rendering as
two separate stacked blocks (the media, then the overlay as its own solid-
color block underneath) instead of one overlapping the other. Fixed by nesting
both inside one shared wrapper div (still using `fullBleedPositionClassName`)
and having each fill it via a plain `absolute inset-0`, so the overlap holds
at every width, not just `atMedium`+.

**Follow-up: split-header mobile parity.** Reported as "logo and links/icon
colors wrong on mobile." Root cause: the split-header rules are desktop-
oriented (media covers only the half matching `data-split-media-side`), but
below `atMedium` Full-bleed's media stacks full-width above the text (see
`fullBleedPositionClassName` in `Hero/Component.tsx`) - so on mobile BOTH
header halves float over the photo, not just the one the desktop side names.
User chose the full fix over a simpler "logo always photo-matched" compromise.

- Widened the generic Surface-based logo mirror's exclusion from
  `:not([data-split-media-side='left'])` to `:not([data-split-media-side])`
  (both values), so it never applies to any Split Full-bleed section, at any
  breakpoint - mutual exclusion by construction, not a specificity race
  (confirmed by hand: a simple presence-based override rule computes lower
  specificity than the generic mirror's `html[data-theme=...]`-prefixed
  variants, so out-specifying it wasn't viable here).
- Added a `@media (width >= 768px)` block that re-derives the full
  Surface-matched logo mapping (default/inverse/muted/accent x
  light/dark scheme x explicit theme override - the same ~20-rule shape as
  the generic mirror) specifically for `[data-split-media-side='right']`,
  since desktop's 'right' case still needs the logo Surface-matched (it's
  over the text side there).
- Added a `@media (width < 768px)` block using presence-only
  `[data-split-media-side]` (matching either value) that gives both
  `.header__controls` and the logo the photo-treatment, redundant-but-
  harmless for the 'left' case (already correct at every width) and closing
  the gap for 'right' (Surface-matched only above this breakpoint).
- **Correction found via screenshot** (Default-surface hero, mobile, 0
  scroll: header text/logo went white on a white background instead of dark):
  the "both halves float over the media on mobile" premise was wrong. Full-
  bleed's mobile media is normal-flow, not absolute (`fullBleedPositionClassName`
  only becomes `position: absolute` at `atMedium`+), so the section's own
  `padding-block-start` (reserved to clear the fixed header) pushes it down
  like any other content - the header never actually overlaps the photo
  below `atMedium`, only the section's own plain Surface-colored padding gap.
  Desktop's absolute positioning genuinely does bypass that padding (same
  trick Media Background uses), so desktop's photo-treatment was correct all
  along; only the mobile "both halves" override was wrong, on every Surface
  (just invisible on darker ones by coincidence).

  Final, corrected truth table (confirmed by re-deriving from the actual
  physical overlap, not assumption):
  - 'left' + logo: photo at `atMedium`+, Surface below it (gated rule +
    mobile-scoped restoration, mirroring 'right's shape).
  - 'left' + controls: always Surface-matched (no override at any width -
    the media is never behind controls for 'left', at either breakpoint).
  - 'right' + logo: always Surface-matched (no media-query gating needed -
    the media is never behind the logo for 'right', at either breakpoint).
  - 'right' + controls: photo at `atMedium`+, Surface below it (gated rule,
    falls through with no override needed below that width).

  The stray "both halves on mobile" block was removed entirely, and the
  'right' controls/logo rules and 'left' logo rules were re-gated to match
  this table exactly.

**Follow-up: left padding on Split text when Text position is Right.**
`textContent`'s `Stack` gets `atMedium:pl-8` when `hasSideMedia && isMediaLeft`
(text on the right, media on the left) - applies uniformly across
Contained/Stretch/Full-bleed since `textContent` is the one shared JSX used
in all three.

**Branch:** `fix/hero-layout-higher-level-choices`

### The problem

`src/blocks/Hero/config.ts` exposes four flat `layout` radio options: `Image right`,
`Image left`, `Image background`, `Text only`. Two of those (`Image right` /
`Image left`) are really one layout ("Split") with a position choice bundled into
the option name, which clutters the picker and doesn't match the naming the user
settled on: **Text-only**, **Split**, **Media Background**.

### The fix

Restructure the `layout` field on the `Layout` tab to three top-level choices, and
move image side into its own sub-field shown only for Split:

- `layout` radio options become:
  - `textOnly` -> label **Text-only**
  - `split` -> label **Split** (new value, replaces `imageRight` / `imageLeft`)
  - `backgroundImage` -> label **Media Background** (value unchanged, label renamed
    from "Image background")
- New field `imagePosition` (radio: `left` | `right`, default `right`, label
  "Image position"), `condition: layout === 'split'`, placed right after `layout`.
- Update the `image` field's admin description to reference the new labels
  ("Shown beside the text (Split) or as a full-bleed background (Media
  Background).").
- `overlayCoverage` / `overlayColor` / `overlayOpacity` conditions already key off
  `layout === 'backgroundImage'`, which is unchanged, so they don't need edits.

**Backward compatibility (must not break):** existing saved hero blocks already
have `layout: 'imageRight'` or `'imageLeft'` in Mongo. There is no migration step
in this project (per `coding-standards.md`), so `Component.tsx` must keep
rendering those legacy values correctly:

- `hasImage` must stay true for `layout` in `('split', 'imageRight', 'imageLeft')`
  (excluding `backgroundImage`), not just `'split'`.
- The image-left flip must trigger on `imagePosition === 'left'` **or** the legacy
  `layout === 'imageLeft'`, since old documents have no `imagePosition` value
  saved.
- `layout === 'backgroundImage'` keeps working as-is (value untouched).

Expected, acceptable side effect: opening an old Image-left/right hero block in
the admin will show the `layout` radio unselected (its stored value is no longer
a valid option) until the editor re-picks Split + a side and saves. The public
page keeps rendering correctly in the meantime.

**Follow-up scope (added after initial review):** Text-only heroes need a text
alignment choice. Add an `align` sub-field (`Center` / `Left` / `Right`) shown
only for the Text-only layout, following the same field pattern the
`CallToAction` block already uses for its own `align` field
(`src/blocks/CallToAction/config.ts` + `Component.tsx`): `items-*` on the
surrounding `Stack` for block alignment, plus an explicit `text-center` /
`text-right` class on the heading and subheading for multi-line wrap. Default
`left`, so every already-saved Text-only hero (which has no `align` value
yet) keeps rendering exactly as it does today.

Since then, `imagePosition` was renamed to `headerPosition` (label "Text
position") with its meaning flipped: `left` now means the heading/text sits on
the left (image on the right); the `layout` field's own label was hidden
(`label: false`), and the "Only applies to..." helper descriptions on
`headerPosition`/`align`/`layout` were removed as redundant.

**Follow-up scope: Media type (Image/Video) for Split.** Split currently only
supports an image next to the text. Add a `mediaType` choice (`Image` / `Video`)
so an editor can swap in a video instead. Decision (confirmed with the user):
video is a real **upload** to the `media` collection, not an external URL/embed
field - the `media` collection's upload pipeline needs to accept video files
without breaking its image-only processing.

- `src/collections/Media/config.ts`: widen `upload.mimeTypes` to
  `['image/*', 'video/*']`. Verified safe without further changes - Payload's
  own upload pipeline (`canResizeImage`) and this project's
  `hooks/generateBlurData.ts` (`mimetype.startsWith('image/')` guard) already
  skip resizing/format-conversion/blur-generation for non-image mimetypes, so a
  video upload stores its original file untouched and simply has no `sizes` /
  `blurDataUrl`. `hooks/changeFilename.ts` has no mimetype dependency.
- `src/blocks/Hero/config.ts` (Content tab, next to `image`):
  - New `mediaType` radio (`Image` / `Video`, `defaultValue: 'image'`),
    `condition: layout === 'split'` (Media Background stays image-only - no
    background-video support in this pass).
  - `image` field gets `condition: (_, siblingData) => siblingData?.layout !==
    'split' || siblingData?.mediaType !== 'video'` (shown for Media Background
    always, and for Split only when Media type is Image).
  - New `video` upload field, `relationTo: 'media'`,
    `filterOptions: { mimeType: { contains: 'video' } }` (same pattern as
    `.claude/rules/fields.md`'s image `filterOptions` example),
    `condition: (_, siblingData) => siblingData?.layout === 'split' &&
    siblingData?.mediaType === 'video'`.
- `src/blocks/Hero/Component.tsx`:
  - Read `mediaType`, `video`.
  - `hasImage` excludes the case where Split + `mediaType === 'video'` (a
    video doc renders instead, never both).
  - New `hasVideo = (layout === 'split' || isLegacySplit) && mediaType ===
    'video' && isDoc<Media>(video)`. Legacy `imageRight`/`imageLeft` docs have
    no `mediaType`, so they fall through to the existing image path
    unaffected.
  - Render a plain `<video>` (not `MediaImage`, which is `next/image`-based
    and only handles images) using `video.url`, `controls`, `playsInline`,
    `className="flex-1"`, with the same `ui-img h-auto` sizing class and
    `rounded-[var(--radius-image)] shadow-[var(--shadow-image)]` classes
    `MediaImage` applies in non-fill mode, so a video sits visually consistent
    with an image in the same slot.
- Run `npm run generate:types`.

**Follow-up scope: Video loop / hide-controls for Split.** Two checkboxes next
to `video` (same condition: Split + Media type Video): `videoLoop` ("Loop") and
`videoHideControls` ("Hide controls"). Decision (confirmed with the user):
hiding controls also autoplays the video muted - otherwise a hidden-control
video has no way to ever start. `Component.tsx`'s `<video>` gets
`loop={videoLoop}`, `controls={!videoHideControls}`,
`autoPlay={videoHideControls}`, `muted={videoHideControls}`, `playsInline`
(always, needed for iOS autoplay).

**Follow-up scope: Video for Media Background too.** Extend the same Image/Video
choice to the full-bleed Media Background layout, not just Split.

- `mediaType`'s condition widens to `layout === 'split' || layout ===
  'backgroundImage'`; `image` and `video`'s conditions widen the same way
  (hidden/shown based on `mediaType === 'video'` for either of those two
  layouts, unchanged for Text-only).
- Design decision (not re-confirmed with the user - inferred from the near-
  universal convention for full-bleed background video, and consistent with
  the autoplay reasoning already agreed for Split's Hide-controls): a Media
  Background video always renders `autoPlay muted loop playsInline`, no native
  controls, unconditionally. The `videoLoop`/`videoHideControls` checkboxes
  stay scoped to Split only (their condition is unchanged) - they don't apply
  to a decorative full-bleed backdrop, which has no sensible "show player
  controls over the background" mode.
- `Component.tsx`: `hasBackgroundVideo = isBackgroundImage && mediaType ===
  'video' && isDoc<Media>(video)`; `hasBackgroundImage` gets `&& mediaType !==
  'video'` added. Introduce `hasBackgroundMedia = hasBackgroundImage ||
  hasBackgroundVideo` and use it everywhere the old `hasBackgroundImage` drove
  the overlay (`overlayOverWholeImage`/`overlayOverContentOnly`) and the
  `<Section hasBackgroundImage={...}>` prop (that prop's own meaning, per its
  comment in `Section.tsx`, is "this section has a full-bleed media backdrop,"
  not literally "is an image" - a video backdrop needs the same header-contrast
  handling). The image/video render branches stay separate
  (`hasBackgroundImage`/`hasBackgroundVideo` respectively); the overlay `<div>`
  moves out to render once, independent of which media type is behind it.
  Background `<video>` uses the same `ui-hero-bg` positioning class the image
  fill mode uses, plus `ui-img-cover` for `object-fit: cover`.
- Run `npm run generate:types`.

**Follow-up scope: Media fill for Split.** Today Split's media renders inline at
its own intrinsic aspect ratio, vertically centered next to the text - next to
a tall text column it can look small. Add a `mediaFill` choice (confirmed with
the user, all three): **Contained** (today's look, default), **Stretch**
(media crops to fill the full height of the row, matching the text column),
**Full-bleed** (media fills the full height of the *section* and bleeds to the
section's outer edge, breaking out of the `Container`'s horizontal padding -
the classic 50/50 split-hero look). `condition: layout === 'split'`, placed
after `headerPosition`.

- **Contained / Stretch** stay inside the existing `Container` + flex-row
  structure:
  - Row's cross-axis alignment: `atMedium:items-center` for Contained (today),
    `atMedium:items-stretch` for Stretch.
  - Contained's media stays exactly as today (`MediaImage size="fullSize"` /
    `<video>` with `ui-img h-auto`, intrinsic aspect ratio).
  - Stretch wraps the media in a `relative flex-1` div and renders it filling
    that box: `MediaImage fill` (reusing the same `fill` prop Media
    Background already uses) for images, `<video className="absolute inset-0
    h-full w-full object-cover ...">` for video.
- **Full-bleed** superseded by a corrected design below (the first pass put
  the media inside a grid cell in normal flow, which is still subject to
  Section's own `padding-block` - so it had visible top/bottom padding instead
  of truly reaching the section's edges; fixed as a follow-up, see below).
- The heading/subheading/buttons `<Stack>` JSX is extracted into one
  `textContent` variable reused everywhere, to avoid duplicating the
  editable-field wiring and button mapping.
- Run `npm run generate:types`.

**Follow-up fix: Full-bleed had top/bottom padding.** Root cause: the Full-bleed
media was rendered as a normal-flow grid cell, a child of a wrapper that,
while it bypassed `Container`'s horizontal padding, still sat *inside*
`<Section>` and was therefore still inset by `Section`'s own vertical
`padding-block` (`--section-space`) - the same padding every other layout
gets. It never actually escaped Section's box, just Container's.

Fix: match how Media Background already achieves true edge-to-edge coverage -
render the Full-bleed media as a *direct child of `<Section>`*,
`position: absolute` with `inset-block: 0` (`atMedium:inset-y-0`), which
aligns to the padding box of the nearest positioned ancestor (`Section`,
`position: relative`) and therefore ignores that ancestor's own padding, the
same way `.ui-hero-bg`'s `inset: 0` already does for Media Background's
fill image. `atMedium:w-1/2` plus `atMedium:left-0`/`atMedium:right-0`
(by `isMediaLeft`) constrains it to its half. Below `atMedium` it stays
`position: relative` in normal flow (`aspect-video` for a real height) so it
still stacks above/below the text like every other layout's mobile fallback,
only becoming absolute at `atMedium`.

This removes the need to bypass `Container` at all: `<Container>` still wraps
the text as it does for every other layout (so it keeps the site's normal
max-width/gutter), but the text's inner div gets `atMedium:w-1/2` plus
`atMedium:ml-auto`/`atMedium:mr-auto` (opposite the media's side) to occupy
just its own half. Because `Container` is itself horizontally centered in
`Section` regardless of its own max-width, the text half's boundary (50% of
Container's width) and the media's boundary (50% of Section's - i.e. the full
viewport's - width) land on the exact same point (the viewport's horizontal
center) at any viewport width, so the two halves always align, even past the
site's max container width.

`renderMedia(wrapperClassName)` factors out the shared image/video JSX (it
only ever differed by wrapper class), reused for the in-row placement
(Contained/Stretch, unchanged) and this new Section-level placement
(Full-bleed).

### Build steps

- [x] **Update `src/blocks/Hero/config.ts` and `src/blocks/Hero/Component.tsx`
   together.**
   - `config.ts`: replace the `layout` options list, add the `imagePosition`
     field, update the `image` field's description.
   - `Component.tsx`: update `hasImage` and the image-left flip condition per the
     compatibility rules above, reading the new `imagePosition` field.
   - Run `npm run generate:types` to refresh `HeroBlock` in `src/payload-types.ts`.
   - Done when: the admin Layout tab shows exactly three `layout` choices
     (Text-only / Split / Media Background), Split reveals an Image position
     (Left/Right) control, and a fresh Split hero + an existing pre-fix
     Image-left/Image-right hero (if one exists in this environment's Mongo) both
     render correctly on the frontend and in live preview.
- [x] **Add Text-only alignment.**
   - `config.ts`: add `align` radio field (options `Center` / `Left` / `Right`,
     `defaultValue: 'left'`, label "Text alignment"), `condition: layout ===
     'textOnly'`, placed after `imagePosition`.
   - `Component.tsx`: read `align`; when `layout === 'textOnly'`, map it to the
     content `Stack`'s `align` prop (`left`->`start`, `center`->`center`,
     `right`->`end`), add `text-center`/`text-right` to the heading and
     subheading, and apply the same `justify` to the button row `Stack` so the
     buttons follow the chosen alignment. Non-text-only layouts are unaffected
     (fall back to the existing `stretch`/`start` behavior).
   - Run `npm run generate:types`.
   - Done when: a Text-only hero set to Center and to Right visibly re-aligns
     the heading, subheading, and buttons together (not just the heading) in
     live preview and on the published page, and a Text-only hero saved before
     this step (no `align` value) still renders left-aligned.
- [x] **Add Media type (Image/Video) for Split.**
   - `Media/config.ts`: widen `mimeTypes` to `['image/*', 'video/*']`.
   - `Hero/config.ts`: add `mediaType`, add the `video` upload field with its
     `filterOptions`, and update `image`'s `condition` per the design above.
   - `Hero/Component.tsx`: add `hasVideo`, adjust `hasImage`, render the
     `<video>` element.
   - Run `npm run generate:types`.
   - Done when: on a Split hero, Media type: Video hides the Image field and
     shows a Video field filtered to video uploads; uploading an actual video
     file to Media succeeds (no error from the image pipeline); the video
     plays with controls in the Split slot on the published page and in live
     preview; switching Media type back to Image (or any non-Split layout)
     renders exactly as before this step.
- [x] **Add video Loop / Hide controls.**
   - `Hero/config.ts`: add `videoLoop` and `videoHideControls` checkboxes,
     same condition as `video`.
   - `Hero/Component.tsx`: wire them into the `<video>` element per the design
     above.
   - Run `npm run generate:types`.
   - Done when: a Split + Video hero with Hide controls off shows native
     player controls (no autoplay); with Hide controls on, the video
     autoplays muted with no visible controls; Loop replays the video instead
     of stopping on the last frame in either case.
- [x] **Extend Media type to Media Background.**
   - `Hero/config.ts`: widen `mediaType`/`image`/`video` conditions per the
     design above.
   - `Hero/Component.tsx`: add `hasBackgroundVideo`, `hasBackgroundMedia`,
     refactor the overlay to render once, add the forced-autoplay `<video>`
     background render.
   - Run `npm run generate:types`.
   - Done when: on a Media Background hero, Media type: Video hides Image and
     shows Video; the video fills the section edge-to-edge, autoplays muted on
     loop with no visible controls, and the existing overlay
     (coverage/color/opacity) still darkens it correctly; switching back to
     Image (or to Split/Text-only) renders exactly as before this step.
- [x] **Add Media fill (Contained/Stretch/Full-bleed) for Split.**
- [x] **Fix Full-bleed's top/bottom padding.**
- [x] **Extend overlay color/opacity to Split Full-bleed.**
- [x] **Fix: overlay was landing on the text side, not the media side.**
- [x] **Extend header contrast to Split Full-bleed.**
   First pass split the header into a logo-half/controls-half treatment
   (matching which side the media was on), needing a new `Section.tsx`
   `splitMediaSide` prop and matching `_header.css` rules. The user corrected
   this: they want the exact same "whole header switches" logic Media
   Background already uses, applied to Split Full-bleed regardless of which
   side the media is on - not a half-and-half split. Reverted the
   `splitMediaSide` prop and the new `_header.css` rules entirely (back to
   their pre-this-step form) and instead just widened what Hero passes into
   Section's existing `hasBackgroundImage` prop:
   `hasBackgroundImage || hasFullBleedMedia`, where `hasFullBleedMedia =
   mediaFillMode === 'fullBleed' && hasSideMedia`. No new `_header.css` needed
   at all - the existing `data-has-background-image` mechanism (whole-header
   `--header-fg` switch + logo image swap) now just also fires for Split
   Full-bleed, exactly like it already does for Media Background.
   `needsDarkOverlayText` unchanged from the first pass (Light overlay color
   still flips to dark text, for either layout).
   - CTA buttons (`.ui-btn`) still don't change color in either case - they
     use their own fixed brand tone, not `--header-fg`.
   - **Reverted, then whole-header re-added, then corrected to the
     half-and-half split design** (confirmed with the user): the header's
     LOGO half and CONTROLS half are colored independently based on which
     one actually floats over the media - the opposite half keeps adopting
     the section's normal Surface color, since it's really over the text
     side. This is the original design from earlier in this build step,
     restored in full: `Section.tsx`'s `splitMediaSide` prop, and
     `_header.css`'s `.header__controls`-scoped rule (`data-split-media-
     side='right'`) plus the LOGO-swap mirror (`='left'`) with the matching
     `:not([data-split-media-side='left'])` widened exclusions on the
     Surface-based logo rules, are back verbatim. Verified this time with a
     full re-read of every touched file end to end (the earlier revert had
     left one stray reference `npm run build`'s `--experimental-build-mode
     compile` didn't catch - a direct `tsc --noEmit` is blocked by this
     project's `tsconfig.json` having `"ignoreDeprecations": "6.0"`, which
     the installed TypeScript 5.7.3 rejects; out of scope to fix here).
   Root cause: the overlay div combines `fullBleedPositionClassName` with
   `.ui-hero-overlay`, whose CSS sets `inset: 0` unconditionally (including
   `left: 0`). When media was on the right, only `right-0` was added -
   `.ui-hero-overlay`'s `left: 0` stayed active, and with left, right, and
   width all set, CSS drops `right` in LTR and the box always anchored to
   `left`, landing the overlay on the text side. Fixed by explicitly setting
   both sides of the inset (`left-0 right-auto` / `right-0 left-auto`)
   instead of only the occupied one.
   Design: `overlayColor`/`overlayOpacity` conditions widen to also cover
   `layout === 'split' && mediaFill === 'fullBleed'`; `overlayCoverage` stays
   Media-Background-only (Split's media is its own half, never under the
   text, so "text area only" has no equivalent). Since the overlay is a
   legibility requirement for Media Background but purely decorative for
   Split, `resolvedOverlayOpacity` only implicit-defaults to `'medium'` for
   Media Background - Split defaults to `'none'` when unset, so making the
   field apply to Split doesn't retroactively tint every already-published
   Full-bleed hero with no opacity ever saved. The overlay div reuses the
   exact same absolute-positioning classes as the Full-bleed media itself
   (`fullBleedPositionClassName`), so the tint covers only the media's own
   half, never the text half.
   - `Hero/config.ts`: add `mediaFill` radio.
   - `Hero/Component.tsx`: extract `textContent`; implement the
     Contained/Stretch row variants and the Full-bleed grid variant per the
     design above.
   - Run `npm run generate:types`.
   - Done when: a Split hero cycles through all three Media fill values and
     each renders as described (Contained unchanged from today; Stretch crops
     to the text column's height; Full-bleed reaches the section's true outer
     edge and fills the section's full height) in live preview and on the
     published page, on both mobile and `atMedium`+ widths; a Split hero saved
     before this step (no `mediaFill` value) still renders as Contained.

### Verify

- In the admin, add a Hero block, switch `layout` through all three options, and
  confirm the Layout tab only shows Image position when Split is selected, and
  only shows the overlay controls when Media Background is selected.
- Set Split + Left and Split + Right, save, and confirm the live preview and
  published page swap the image side correctly.
- If an existing page already has an `imageRight` or `imageLeft` hero, load it on
  the frontend and confirm it still renders with the image on the correct side
  despite the admin radio showing unselected.
- Set Text-only + Center and Text-only + Right, and confirm heading, subheading,
  and buttons all re-align together, on both live preview and the published page.
- `npm run generate:types` runs clean and `HeroBlock` reflects the new fields.
