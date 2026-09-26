## Title

Add a "Type" label above the Hero block's layout picker, badge the Layout tab's key labels

**Type:** Fix
**Status:** verified
**Branch:** `fix/hero-layout-type-label`

## The problem

In [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts#L162-L175), the Hero
block's "Layout" tab starts with a `radio` field named `layout` (options:
Text-only, Split, Media Background) that has `label: false`. Every other field
in that tab (`headerPosition`, `mediaFill`, etc.) has its own visible label, so
this one stands out as unlabeled — editors see three unlabeled radio buttons
sitting directly under the tab heading with no indication of what they select.

## The fix

Give the `layout` field a visible label of `'Type'` instead of `label: false`,
so it reads as "Type: Text-only / Split / Media Background" above the other
Layout-tab controls. Purely an admin-config label change — no data shape,
schema, or frontend rendering changes, so no type regeneration or migration is
needed.

## Build steps

1. [x] In [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts#L167), change
   `label: false` to `label: 'Type'` on the `layout` field.
   **Done when:** the Hero block's Layout tab shows a "Type" label above the
   Text-only / Split / Media Background radio options in the admin UI, and
   `npm run build` (or `npm run lint`) passes with no new errors.
   `npm run lint` passes with 0 errors (4 pre-existing, unrelated warnings).

2. [x] Badge the Layout tab's `layout` ("Type"), `headerPosition` ("Text
   position"), `align` ("Text alignment"), `overlayCoverage` ("Overlay
   coverage"), `overlayColor` ("Overlay color"), and `overlayOpacity` ("Overlay
   opacity") field labels with the same colored background pill treatment
   initially matched to the admin nav's sidebar group headings
   (Collections/Content/Globals) in
   [src/custom/admin-timestamps/styles.css:216-231](src/custom/admin-timestamps/styles.css#L216-L231)
   (later recolored dark gray in step 5). Add a reusable
   `admin.className: 'field-label--sidebar-badge'` to each of those six fields
   in [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts), and a matching
   `.field-label--sidebar-badge .field-label` rule in
   [src/app/(payload)/custom.scss](src/app/\(payload\)/custom.scss). `mediaFill`
   ("Media fill") and the Appearance field stay plain for now — extended to
   them too in step 4.
   **Done when:** in the admin UI, the six named labels render as a colored
   pill matching the nav sidebar's group-heading style, and `npm run lint` /
   `npm run build` pass with no new errors.

3. [x] Wrap each of those same six fields' label-plus-options in a border, by
   adding a `border` / `border-radius` / `padding` rule for the
   `.field-label--sidebar-badge` class itself in
   [src/app/(payload)/custom.scss](src/app/\(payload\)/custom.scss) - that
   class already sits on RadioGroupField's own outer wrapper div (label and
   options both render inside it), so the border encloses the whole group
   rather than just the label text.
   **Done when:** in the admin UI, each of the six badged fields shows a
   bordered box containing its pill label and its radio options together, and
   `npm run lint` / `npm run build` pass with no new errors.

4. [x] Extend the same `field-label--sidebar-badge` badge-plus-border treatment
   to `mediaFill` ("Media fill") and Hero's Appearance field ("Surface").
   `mediaFill` gets `admin.className` directly in
   [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts). `Surface` comes
   from the shared `appearanceField()` helper
   ([src/fields/appearance.ts](src/fields/appearance.ts)), used by eight other
   call sites (CallToAction, RichTextBlock, FeatureGrid, Table, Footer, Posts
   x2, BlogListing, FeaturedPost) that must stay unstyled - so `appearanceField`
   gains an optional second `className` parameter that only Hero's call
   passes, rather than hardcoding the class into the shared helper.
   **Done when:** in the admin UI, "Media fill" and "Surface" (Hero's
   Appearance field) render with the same pill label + border treatment as
   the other four fields; every other block/collection using
   `appearanceField()` still renders its Surface field unstyled; and
   `npm run lint` / `npm run build` pass with no new errors.

5. [x] Change the badge pill's background from the nav-matching teal
   (`#137c95cc`) to a dark gray (`#374151`) in
   [src/app/(payload)/custom.scss](src/app/\(payload\)/custom.scss), across all
   eight badged labels.
   **Done when:** all eight badged labels in Hero's Layout tab render as a
   dark gray pill (not teal), and `npm run lint` / `npm run build` pass with
   no new errors.

6. [x] Render Hero's Surface field as radio buttons instead of a dropdown, to
   match the radio-based fields around it in the Layout tab. `appearanceField()`
   ([src/fields/appearance.ts](src/fields/appearance.ts)) gains a third
   optional `fieldType: 'radio' | 'select'` parameter (default `'select'`, so
   the other 8 call sites keep their dropdown); Hero's call passes `'radio'`.
   Same option values either way, so the generated `surface` union type is
   unaffected - confirmed via `npm run generate:types` (no diff to
   `src/payload-types.ts`).
   **Done when:** Hero's Layout tab shows Surface as radio buttons
   (Default/Inverse/Primary color/Secondary color), every other block's
   Surface field still renders as a dropdown, `npm run generate:types`
   produces no diff, and `npm run lint` / `npm run build` pass with no new
   errors.

7. [x] Move Surface to render directly after Type, before Text position, in
   [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts) - purely a field
   order change within the `fields` array, no data/schema impact.
   **Done when:** in the admin UI, Hero's Layout tab shows Surface immediately
   below Type (above Text position/Media fill/Text alignment/Overlay
   controls), and `npm run lint` / `npm run build` pass with no new errors.

8. [x] Move Text alignment (`align`) to render directly after Text position
   (`headerPosition`), before Media fill, in
   [src/blocks/Hero/config.ts](src/blocks/Hero/config.ts) - field order only,
   no data/schema impact.
   **Done when:** in the admin UI, Hero's Layout tab order reads Type ->
   Surface -> Text position -> Text alignment -> Media fill -> Overlay
   coverage/color/opacity, and `npm run lint` / `npm run build` pass with no
   new errors.

## Verify

In the admin panel, open any page with a Hero block, go to its **Layout** tab,
and confirm:

- A "Type" label appears above the Text-only / Split / Media Background radio
  options.
- Every field in the tab - Type, Surface, Text position, Text alignment, Media
  fill, Overlay coverage, Overlay color, Overlay opacity - renders its label as
  a dark gray pill, each wrapped in a bordered box together with its options.
- Surface renders as radio buttons (Default/Inverse/Primary color/Secondary
  color), not a dropdown.
- Field order top to bottom: Type, Surface, Text position, Text alignment,
  Media fill, Overlay coverage, Overlay color, Overlay opacity.

Also open a page/global using a different block or collection with an
Appearance section (e.g. CallToAction, FeatureGrid, or a Post's Layout tab)
and confirm its "Surface" field still renders plain, unstyled, and as a
dropdown (not radio buttons) - both the badge and the radio conversion are
Hero-only.
