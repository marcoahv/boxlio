# Current Feature

**Title:** Button border radius setting
**Type:** Fix
**Status:** verified
**Branch:** `fix/button-border-radius`

## The problem

`src/globals/Settings/config.ts` has an `imageRadius` select field that lets
editors control image corner rounding sitewide (`None`/`Small`/`Medium`/
`Large`/`Extra Large`), threaded through to CSS via a `data-image-radius`
attribute on `<html>` and a `--radius-image` custom property. Buttons
(`ui-btn` and its variants in `src/app/(frontend)/styles/elements/_button.css`)
have no equivalent setting, and no `border-radius` at all today — they render
with square corners with no way for an editor to change that.

## The fix

Add a `buttonRadius` field to the `Settings` global, mirroring `imageRadius`'s
shape and wiring exactly (same options, same `data-attribute` -> CSS custom
property pattern), then apply the resulting `--radius-button` token to the
shared `ui-btn` base utility class so it covers every button variant
(solid/outline/ghost, primary/secondary) since they all always include
`ui-btn` in their class list.

Default to `'none'` rather than copying `imageRadius`'s `'md'` default: buttons
currently render square, so a `none` default preserves today's look for
existing sites until an editor opts into rounding. This is a deliberate
deviation from the `imageRadius` default — flag it in review if a different
default is wanted.

Must not break: `imageRadius`'s existing behavior and admin field position
(unaffected — new field is separate), the two-column Settings admin layout,
button hover states and variant/color modifiers in `_button.css`.

## Build steps

- [x] 1. **Add the `buttonRadius` setting and apply it to buttons.**
  - In `src/globals/Settings/config.ts`, add a `buttonRadius` field
    immediately after `imageRadius`, same shape:
    ```ts
    {
      name: 'buttonRadius',
      type: 'select',
      label: 'Button Corner Radius',
      defaultValue: 'none',
      options: [
        { label: 'None', value: 'none' },
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md' },
        { label: 'Large', value: 'lg' },
        { label: 'Extra Large', value: 'xl' },
      ],
      admin: {
        description: 'Controls how rounded button corners are across the site.',
      },
    },
    ```
  - Run `npm run generate:types` to add `buttonRadius` to the generated
    `Setting`/`SettingsSelect` types in `src/payload-types.ts`.
  - In `src/app/(frontend)/layout.tsx`, add `data-button-radius={settings.buttonRadius ?? 'none'}`
    on `<html>`, alongside the existing `data-image-radius` attribute (line 63).
  - In `src/globals/Settings/Component/SettingsLivePreviewSync.tsx`, destructure
    `buttonRadius` from `useScopedLivePreview` alongside `imageRadius` and sync
    it in the same effect: `document.documentElement.setAttribute('data-button-radius', buttonRadius ?? 'none')`.
  - In `src/app/(frontend)/styles/base/_alias-tokens.css`, add a "Button
    radius" block mirroring the "Image radius" block (~line 163-192):
    `:root { --radius-button: var(--radius-none); }` plus one
    `html[data-button-radius='...']` rule per option, each pointing at the
    matching `--radius-*` base token.
  - In `src/app/(frontend)/styles/elements/_button.css`, add
    `border-radius: var(--radius-button);` to the `ui-btn` utility (near the
    existing `border: none;` line).
  **Done when:** `npm run build` passes; the Settings admin edit view shows a
  "Button Corner Radius" field (defaulting to None) next to "Image Corner
  Radius"; changing it and saving changes the rendered corner rounding on
  CTA/Hero/Header buttons across all variants after a reload; live preview
  updates button rounding without a manual reload; the image radius setting
  still works unaffected.

## Verify

- `npm run dev`, open `/admin` -> Settings: confirm "Button Corner Radius"
  appears with the same five options as "Image Corner Radius", defaulting to
  None.
- Set it to "Large", save, and reload a page with buttons (home page CTA,
  Hero, Header nav) — corners should now be visibly rounded on every button
  variant (solid, outline, ghost, primary, secondary).
- Open Settings' live preview, change the field, and confirm button rounding
  updates immediately without a page reload.
- Confirm "Image Corner Radius" still independently controls image rounding
  (no regression from the shared alias-token file edit).
