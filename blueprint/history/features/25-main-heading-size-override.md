# Current Feature

**Title:** Main heading size override
**Type:** Feature (build-plan item 25)
**Status:** verified
**Branch:** `feature/main-heading-size-override`

## Goal

Give editors a site-wide override in Settings -> Typography that can make the
site's two real page-level headings (the Hero block's heading and a blog
post's title - the only two places `<Heading level={1}>` renders anywhere in
the codebase) larger than what Heading Scale alone produces, for a more
editorial, display-driven look on pages that want it. Follows the exact same
field -> `data-*` attribute on `<html>` -> CSS custom property ->
live-preview-sync pattern already shipped for every other Typography/
Whitespace control (Heading Font/Body Font/Heading Scale, feature 22).

## In scope

- A new `select` field on the Typography tab in
  `src/globals/Settings/config.ts`, after `headingScale`:
  - `name: 'mainHeadingSize'`
  - `label: 'Additional Sizes for Main Headings'` (typo-corrected from the
    request's "Aditional")
  - `defaultValue: 'default'`
  - `options`: `Default` (`'default'`) / `Display` (`'display'`) / `Large
    Display` (`'display-lg'`)
  - `admin.description` explaining the effect and its exact scope (see Data /
    contracts).
- 6 new tokens in `_base-tokens.css`, grouped under the Typography section
  next to `--text-h1-*`: `--text-h1-display-mobile/-tablet/-desktop` and
  `--text-h1-display-lg-mobile/-tablet/-desktop`. Desktop values reuse the
  project's existing `--text-7xl` (`7.2rem`) and `--text-8xl` (`9.6rem`)
  literals (same anchors the now-removed per-instance Display feature used
  for its first two tiers); mobile/tablet interpolated at the same ~0.6x/
  ~0.8x-of-desktop ratio already used throughout this token system, rounded
  to the file's `0.2rem` granularity - numerically identical to that earlier
  feature's Display-Small/Display-Medium rows, reused here as Display/Large
  Display:

  | Token | mobile | tablet | desktop |
  |---|---|---|---|
  | `--text-h1-display-*` | `4.4rem` | `5.8rem` | `7.2rem` |
  | `--text-h1-display-lg-*` | `5.8rem` | `7.6rem` | `9.6rem` |

- A new indirection cascade in `_alias-tokens.css`: `--heading-1-mobile`/
  `-tablet`/`-desktop`, defaulting to `var(--text-h1-mobile/-tablet/-desktop)`
  and overridden under `html[data-main-heading-size='display']` /
  `='display-lg']` to the new tokens above - the same
  field -> data-attribute -> CSS-cascade shape as every existing Typography
  cascade in this file.
- Wiring `data-main-heading-size={settings.mainHeadingSize ?? 'default'}` onto
  `<html>` in `layout.tsx`, alongside the existing Typography/Whitespace
  attributes.
- Changing `_heading.css`'s `ui-heading-1` utility (only `ui-heading-1` -
  `ui-heading-2` through `-6` are untouched) to read from
  `var(--heading-1-mobile/-tablet/-desktop)` instead of
  `var(--text-h1-mobile/-tablet/-desktop)`, still multiplied by
  `var(--heading-scale, 1)` exactly as today - so Heading Scale keeps scaling
  whichever base size (normal or Display) is currently active, matching the
  compositional relationship the two controls already have.
- Syncing `mainHeadingSize` during live preview in
  `SettingsLivePreviewSync.tsx` (one more field alongside the existing
  Typography/Whitespace ones).
- Running `npm run generate:types` after the Settings field addition.

## Out of scope

- **Rich-text `<h1>`.** `_prose.css`'s `.ui-prose h1` rule already renders a
  rich-text h1 at `--text-h2-*` size (a pre-existing, deliberate choice
  treating it as a subordinate heading, since the real page h1 lives
  elsewhere) and reads `--text-h2-*` tokens directly, never `--text-h1-*` or
  the new `--heading-1-*` indirection - so it is unaffected by this feature
  with no extra code needed to exclude it. Confirmed with the user before
  writing this spec.
- **Any change to `Hero/Component.tsx` or `PostClient.tsx`.** Both already
  render their heading via plain `<Heading level={1}>` with no `size` prop,
  which already resolves to the `ui-heading-1` class - this feature's whole
  mechanism lives in the CSS token layer under that one existing class, so
  neither consumer needs to change at all.
- **Reintroducing the removed per-instance `headingDisplaySize` field** on
  Hero/Posts (built in an earlier session's steps 14-18, fully removed in
  that session's step 31 at the user's explicit request). This feature is a
  single **site-wide** Settings toggle, architecturally simpler and
  deliberately different - not a resurrection of that per-instance mechanism.
- Any change to `headingScale`'s own three options, values, or behavior -
  Main Heading Size only adds a second, independent multiplier layer on top
  of it for `ui-heading-1` specifically.
- `ui-heading-2` through `ui-heading-6` - untouched; this feature only
  affects the site's actual `<h1>` (page-level main heading).
- Per-block or per-page override of this new setting - like Heading Font/
  Body Font/Heading Scale, it stays one site-wide value.

## Build loop

Per `blueprint/config.json` (`workflow.stepReview: "feature"`,
`checkpointCommits: "disabled"`): implement and verify each step below in
order without pausing for approval between them, keeping the project working
after every step, then stop and present one review packet with the complete
diff and each step's Done-when evidence before `/complete`. No checkpoint
commits.

## Build steps

- [x] 1. **Add the `mainHeadingSize` field and regenerate types.** Add the new
  `select` field to the Typography tab in `src/globals/Settings/config.ts`,
  after `headingScale`, as described in In scope. Run `npm run
  generate:types`. **Done when:** `payload-types.ts`'s `Setting` type includes
  `mainHeadingSize: ('default' | 'display' | 'display-lg') | null` (or
  equivalent optional-field shape matching the file's existing convention);
  in `/admin` -> Settings -> Typography, a new "Additional Sizes for Main
  Headings" field renders with the three correct options and "Default"
  selected by default.

- [x] 2. **Add the 6 new Display tokens to `_base-tokens.css`.** Add
  `--text-h1-display-mobile/-tablet/-desktop` and
  `--text-h1-display-lg-mobile/-tablet/-desktop` from the In scope table,
  grouped with the existing `--text-h1-*` tokens under the Typography
  section, with a comment cross-referencing `--text-7xl`/`-8xl` as the
  desktop anchors. **Done when:** `npm run build` passes.

- [x] 3. **Add the `--heading-1-*` indirection cascade and wire the `<html>`
  attribute.** Add the `--heading-1-mobile/-tablet/-desktop` cascade to
  `_alias-tokens.css` as described in In scope. Add
  `data-main-heading-size={settings.mainHeadingSize ?? 'default'}` to
  `<html>` in `layout.tsx`. **Done when:** `npm run build` passes; view-source
  on a fresh SSR page shows `data-main-heading-size="default"` on `<html>`
  before any edit.

- [x] 4. **Point `ui-heading-1` at the new indirection tokens.** In
  `_heading.css`, change `ui-heading-1`'s three `font-size` declarations from
  `var(--text-h1-mobile/-tablet/-desktop)` to
  `var(--heading-1-mobile/-tablet/-desktop)`, keeping the existing
  `* var(--heading-scale, 1)` multiplication and `ui-heading-2` through `-6`
  untouched. **Done when:** `npm run build` and `npm run lint` pass; in the
  browser, with Settings -> Typography -> Additional Sizes for Main Headings
  set to Display or Large Display in turn, both the Hero block's heading and
  a blog post's title render visibly larger at every breakpoint, while every
  `ui-heading-2` through `-6` element and any rich-text `<h1>` are unaffected;
  changing Heading Scale still visibly scales the result at every Main
  Heading Size setting, including Default.

- [x] 5. **Sync `mainHeadingSize` during live preview.** Destructure
  `mainHeadingSize` from the existing `useScopedLivePreview<Setting>` call in
  `SettingsLivePreviewSync.tsx`, and add one more `useEffect` calling
  `document.documentElement.setAttribute('data-main-heading-size', ...)`,
  matching the file's existing pattern. **Done when:** `npm run build`
  passes; with Settings open in the admin's live preview pane, changing
  Additional Sizes for Main Headings updates the previewed Hero heading (or
  post title, on a post's own live preview) instantly, with no save
  required.

## Files / areas

- `src/globals/Settings/config.ts` - edit (new `mainHeadingSize` field on the
  Typography tab)
- `src/app/(frontend)/styles/base/_base-tokens.css` - edit (6 new
  `--text-h1-display*` tokens)
- `src/app/(frontend)/styles/base/_alias-tokens.css` - edit (new
  `--heading-1-*` indirection cascade)
- `src/app/(frontend)/styles/elements/_heading.css` - edit (`ui-heading-1`
  only, reads the new indirection tokens)
- `src/app/(frontend)/layout.tsx` - edit (1 new `data-*` attribute)
- `src/globals/Settings/Component/SettingsLivePreviewSync.tsx` - edit (1 new
  synced field)
- `src/payload-types.ts` - regenerated by `npm run generate:types`, not
  hand-edited

No new files. No changes to `Hero/Component.tsx`, `PostClient.tsx`, or
`Heading.tsx` - see Out of scope.

## Data / contracts

New optional `select` field on the `settings` global:

| Field | Label | Values | Default | CSS effect |
|---|---|---|---|---|
| `mainHeadingSize` | Additional Sizes for Main Headings | `default` \| `display` \| `display-lg` | `default` | Switches `--heading-1-mobile/-tablet/-desktop` (consumed by `ui-heading-1` only) between the normal `--text-h1-*` tokens and one of the two new `--text-h1-display*` token sets |

`--heading-1-*` is still multiplied by the existing `--heading-scale` custom
property in `ui-heading-1`'s `calc()`, exactly as `--text-h1-*` was before -
Heading Scale and Main Heading Size compose (both apply together), they don't
replace each other.

No new API route or access-control rule - rides `settings`' existing default
Payload REST/GraphQL/Local API surface, same as every other Typography field.

## Testing

No pure logic is introduced (a select field and CSS token wiring only), so
this stays unit-test-exempt per `coding-standards.md`'s testing scope rule,
matching every other Settings style-token feature. Verify manually with
`npm run dev` via `/try` after implementation:

- Hero block heading and a blog post's title both render at Default size
  identical to before this feature, then visibly larger at Display, then
  larger again at Large Display.
- Every other heading (`h2`-`h6` anywhere, plus a rich-text `<h1>` inside a
  `RichTextBlock` or a Post's body) is unaffected at every Main Heading Size
  setting.
- Heading Scale (Compact/Default/Large) still visibly scales the Hero
  heading/post title at every Main Heading Size setting, including Display
  and Large Display.
- Settings live preview: dragging the new field updates a previewed Hero
  heading and a previewed post title instantly, no save required.
- `npm run build`, `npm run lint`, and `npm run generate:types` all pass.

## Notes for the AI

- This is a **site-wide** override, not the per-instance `headingDisplaySize`
  field an earlier session built on Hero/Posts and then fully removed at the
  user's request - do not reintroduce fields on `Hero/config.ts` or
  `Posts/config.ts`, and do not widen `Heading.tsx`'s `size` prop. Everything
  here lives in Settings + the CSS token layer under the one existing
  `ui-heading-1` class.
- `_prose.css`'s `.ui-prose h1` rule reads `--text-h2-*` tokens directly (a
  pre-existing, deliberate choice unrelated to this feature) - never touch it
  and never route it through the new `--heading-1-*` indirection.
- The 6 new token values are not arbitrary: they reuse the exact desktop
  anchors (`--text-7xl`/`-8xl`) and the same ~0.6x/~0.8x mobile/tablet
  interpolation ratio already validated in this project's token system, and
  are numerically identical to the first two tiers of the now-removed
  per-instance Display feature's 9-token table - intentional reuse of
  previously-vetted values, not new design work.
- Keep `mainHeadingSize` a flat sibling field on the `settings` global (not
  nested in a `group` or `collapsible`), matching `headingFont`/`bodyFont`/
  `headingScale` in the same tab.
