# Hero/CallToAction label styling and layout fixes

**Type:** Fix

**Status:** verified

**Branch:** fix/hero-cta-label-styling

## The problem

- Hero's Content tab field labels (Heading, Subheading, Media type, Image,
  Video, Button(s)) used a different style (font-size only, via
  `field-label--match-array-label`) than the Layout tab's dark badge style
  (`field-label--sidebar-badge`), so the two tabs looked inconsistent.
- Once the badge style was applied to Button(s) (an array field), two side
  effects surfaced:
  - The array's own label - rendered as a `<span>` inside an `<h3>`, not a
    plain `<label>` - inherited the `<h3>`'s larger font size instead of
    matching every other badge label.
  - The badge's gray pill background, meant only for a field's own label,
    also matched every nested `.field-label` inside the array, bleeding onto
    each Button row's own Label/Url/Variant/Color sub-fields.
- CallToAction's Link(s) array had the same Label/Url sub-fields as Hero's
  Button(s) but not paired side by side, unlike Hero.
- After pairing Label/Url into a `row` field (both blocks), the row wrapped
  to two lines with Live Preview open, regardless of browser window size or
  zoom - not Payload's viewport-width "mid-break" (1024px), but Live
  Preview's own narrow 40% edit column plus nested tabs/accordions leaving
  too little width for both fields at their default minimum size.

## The fix

- Apply `field-label--sidebar-badge` to Hero's Content tab fields (Heading,
  Subheading, Media type, Image, Video, Button(s)), replacing the old
  `field-label--match-array-label` class; remove that now-unused class's CSS.
- Keep a font-size/line-height correction scoped to the array's own title so
  it matches every other badge label.
- Scope the pill background so it only renders on an array's own title
  (Button(s)), never on fields nested inside its rows - via a higher-specificity
  selector targeting `.array-field__row .field-label`, not a global change.
- Pair CallToAction's Link(s) Label/Url into a `row`, matching Hero's
  Button(s) structure.
- Force both blocks' label/url rows to stay side by side unconditionally
  (`flex-wrap: nowrap` + `min-width: 0` on the row's fields), so they hold
  up under Live Preview's narrowed column at any zoom level, instead of a
  viewport-width media query that doesn't address the real constraint.
- Must not affect: Layout tab's existing badge styling, or any other block's
  row/array fields - every change is scoped via `hero-buttons-array` /
  `field-row--no-stack` classes on the specific fields, never a global
  selector.

## Build steps

- [x] Update `src/blocks/Hero/config.ts`, `src/blocks/CallToAction/config.ts`,
      and `src/app/(payload)/custom.scss` per the fix above.

  **Done when:**
  - Hero's Content tab labels match the Layout tab's badge look.
  - Button(s)' own title keeps the gray pill; its Label/Url/Variant/Color
    sub-fields don't.
  - Hero and CallToAction's Label/Url fields render side by side at any
    window size or zoom level, including with Live Preview open.

  `npx eslint` on both config files, `sass --no-source-map` on
  `custom.scss`, full `npm run lint`, and `npm run build` all passed clean.
  The three visual "Done when" points were confirmed by CSS specificity/
  layout analysis (no browser tool was available in this session to capture
  live screenshots).

## Verify

- Open a Post or Page with a Hero block; confirm Content tab labels match
  the Layout tab's badge style.
- Expand Button(s): the "Button(s)" title has the gray pill; Label, Url,
  Variant, and Color don't.
- With Live Preview open, confirm Label and Url render side by side (not
  stacked) at 100% browser zoom.
- Add a Call to Action block; confirm its Link(s) Label/Url are also side
  by side.
