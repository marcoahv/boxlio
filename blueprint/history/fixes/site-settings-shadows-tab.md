# Current Feature

## Title

Add a Shadows tab to Site Settings (image, button, card shadows)

**Type:** Fix
**Status:** verified
**Branch:** `fix/site-settings-shadows-tab`

## The problem

`src/globals/Settings/config.ts` already has a "Corner Radius" tab that lets
editors control image and button rounding sitewide, each wired through a
`data-*-radius` attribute on `<html>` and a matching `--radius-*` custom
property (see `imageRadius`/`buttonRadius`). Shadows have no equivalent:
`--shadow-sm`/`--shadow-md`/`--shadow-lg` tokens already exist in
`src/app/(frontend)/styles/base/_alias-tokens.css`, but nothing lets an editor
apply them, and no element (image, button, or card) has an editor-controlled
shadow today. The card's own `:hover { box-shadow: var(--shadow-md); }` in
`src/components/_card.css` is a separate, hardcoded hover effect, not a
resting shadow an editor can pick.

## The fix

Add a third Settings tab, "Shadows", with three `select` fields -
`imageShadow`, `buttonShadow`, `cardShadow` - mirroring `imageRadius`'s
options shape (`None`/`Small`/`Medium`/`Large`, matching the three existing
`--shadow-sm/md/lg` tokens plus a new `none`), each defaulting to `'none'` so
every existing site keeps today's flat look until an editor opts in. Wire each
through the same `data-attribute` -> CSS-custom-property cascade as
`imageRadius`/`buttonRadius`, then apply the resulting tokens as a resting
(non-hover) `box-shadow` on images, buttons, and cards.

The card's existing `:hover` shadow is a deliberate, pre-existing elevate
effect and stays untouched - `cardShadow` only adds an independent resting
shadow via `--shadow-card`. If an editor picks a resting shadow larger than
the hover shadow, the card can visually shrink its shadow on hover; flag this
in review if a hover-aware shadow is wanted instead.

Must not break:

- `imageRadius`/`buttonRadius` and the existing two-tab layout (new tab is
  additive).
- The card's existing hover-shadow behavior in `_card.css`.
- `MediaImage`'s existing `radius` prop and its five call sites.
- The Settings admin two-column layout and live preview.

## Build steps

1. [x] **Add the three shadow fields to `Settings` and regenerate types.**
   In `src/globals/Settings/config.ts`, add a third tab after "Corner
   Radius":
   ```ts
   {
     label: 'Shadows',
     fields: [
       {
         name: 'imageShadow',
         type: 'select',
         label: 'Image Shadow',
         defaultValue: 'none',
         options: [
           { label: 'None', value: 'none' },
           { label: 'Small', value: 'sm' },
           { label: 'Medium', value: 'md' },
           { label: 'Large', value: 'lg' },
         ],
         admin: {
           description: 'Controls the drop shadow applied to images across the site.',
         },
       },
       {
         name: 'buttonShadow',
         type: 'select',
         label: 'Button Shadow',
         defaultValue: 'none',
         options: [/* same four options as imageShadow */],
         admin: {
           description: 'Controls the drop shadow applied to buttons across the site.',
         },
       },
       {
         name: 'cardShadow',
         type: 'select',
         label: 'Card Shadow',
         defaultValue: 'none',
         options: [/* same four options as imageShadow */],
         admin: {
           description:
             'Controls the resting drop shadow applied to cards across the site (separate from the existing hover shadow).',
         },
       },
     ],
   },
   ```
   Run `npm run generate:types`.
   **Done when:** `payload-types.ts`'s `Setting`/`SettingsSelect` types gain
   `imageShadow`/`buttonShadow`/`cardShadow` as
   `('none' | 'sm' | 'md' | 'lg') | null`.

2. [x] **Wire the token cascade.**
   - In `src/app/(frontend)/styles/base/_alias-tokens.css`'s existing
     Shadows `@theme static` block, add `--shadow-none: none;` alongside
     `--shadow-sm`/`--shadow-md`/`--shadow-lg`.
   - Below that block, add three sections mirroring "Image radius"/"Button
     radius" above: "Image shadow", "Button shadow", "Card shadow", each
     `:root { --shadow-<name>: var(--shadow-none); }` plus one
     `html[data-<name>-shadow='...']` rule per option (`none`/`sm`/`md`/`lg`)
     pointing at the matching `--shadow-*` token.
   - In `src/app/(frontend)/layout.tsx`, add
     `data-image-shadow={settings.imageShadow ?? 'none'}`,
     `data-button-shadow={settings.buttonShadow ?? 'none'}`, and
     `data-card-shadow={settings.cardShadow ?? 'none'}` on `<html>`, alongside
     the existing radius attributes.
   - In `src/globals/Settings/Component/SettingsLivePreviewSync.tsx`,
     destructure `imageShadow`, `buttonShadow`, `cardShadow` from
     `useScopedLivePreview<Setting>` and sync each to its `data-*-shadow`
     attribute in its own effect, same pattern as the radius fields.
   **Done when:** `npm run build` passes and the three `data-*-shadow`
   attributes appear on `<html>` in the browser with the right cascaded
   `--shadow-*` custom property per Settings value.

3. [x] **Apply the tokens to images, buttons, and cards.**
   - In `src/components/MediaImage.tsx`, add a `shadow` prop mirroring
     `radius` (`'none' | 'sm' | 'site' | 'lg'`, default `'site'`) with a
     `SHADOW` map (`none`/`sm`/`lg` as explicit per-level overrides, `site`
     pointing at the editor-controlled `--shadow-image` token), and include
     `SHADOW[shadow]` in the rendered `<Image>`'s class list next to
     `RADIUS[radius]`.
   - In `src/app/(frontend)/styles/elements/_button.css`, add
     `box-shadow: var(--shadow-button);` to the `ui-btn` base utility.
   - In `src/components/_card.css`, add `box-shadow: var(--shadow-card);` to
     `.card`'s base rule (not the `:hover` block, which stays as-is).
   **Done when:** `npm run build` and `npm run lint` pass; in the browser,
   setting each Settings shadow field to None/Small/Medium/Large visibly
   changes the resting shadow on images, buttons, and cards respectively,
   with no change to the card's existing hover elevation.

## Verify

- `npm run dev`, open `/admin/globals/settings`: confirm a "Shadows" tab
  appears after "Corner Radius" with Image Shadow, Button Shadow, and Card
  Shadow, all defaulting to None.
- Set each to Small/Medium/Large in turn, save, and reload: confirm images
  (e.g. a Hero or FeatureGrid image), buttons (CTA/Header nav), and blog
  listing cards each show the matching resting shadow, independently of the
  other two settings.
- Confirm a card still gets its existing hover elevation on top of whatever
  resting shadow is set.
- Open Settings' live preview and confirm all three shadow changes apply
  without a manual reload.
- Confirm "Image Corner Radius"/"Button Corner Radius" still work unaffected.
