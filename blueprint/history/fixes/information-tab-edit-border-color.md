## Title

Brand the Information tab's Edit border with the secondary color

**Type:** Fix
**Status:** verified
**Branch:** `fix/information-tab-edit-border-color`

## The problem

The "Edit" collapsible inside the Information tab (Pages and Posts, scoped by
`admin.className: 'info-tab-edit-collapsible'` in
[Pages/config.ts](../../../src/collections/Pages/config.ts) and
[Posts/config.ts](../../../src/collections/Posts/config.ts)) currently uses
Payload's default neutral collapsible border
(`--theme-elevation-200`/`--theme-elevation-300` on hover, from
`@payloadcms/ui`'s `Collapsible` element). It doesn't reflect the site's brand
color at all.

## The fix

Add a scoped override next to the existing `.info-tab-edit-collapsible`
selector in
[src/custom/admin-timestamps/styles.css](../../../src/custom/admin-timestamps/styles.css)
(already the shared stylesheet for this exact hook class — see its
`.info-tab-edit-collapsible .row-label` rule):

- When the collapsible is **open** (`.collapsible` without the
  `.collapsible--collapsed` modifier), set `border-color` to the brand
  secondary-*dark* color.
- On **hover** (open or closed), set `border-color` to the brand secondary
  color, taking priority over the open-state color while the pointer is
  over it (matches Payload's own default pattern, where hover already
  overrides the base border color).
- Leave the closed, non-hovered state on Payload's default neutral border —
  only open and hover are in scope.

Reference the frontend brand tokens
(`--color-secondary-dark` / `--color-secondary`, defined in
[src/app/(frontend)/styles/base/_base-tokens.css](<../../../src/app/(frontend)/styles/base/_base-tokens.css>))
with literal fallback values, since the admin panel doesn't import the
frontend token stylesheet:

```css
.info-tab-edit-collapsible .collapsible:not(.collapsible--collapsed) {
  border-color: var(--color-secondary-dark, #137c95);
}

.info-tab-edit-collapsible .collapsible:hover {
  border-color: var(--color-secondary, #49b7d2);
}
```

Must not affect any other collapsible field in the admin panel — stay scoped
to `.info-tab-edit-collapsible`.

## Build steps

1. [x] Add the two CSS rules above to
   [src/custom/admin-timestamps/styles.css](../../../src/custom/admin-timestamps/styles.css).
   Done when: opening "Edit" in the Information tab (Pages or Posts) shows a
   secondary-dark border, hovering it (open or closed) shows the secondary
   border, and other collapsible fields elsewhere in the admin are unaffected.

## Verify

- In the admin panel, open a Page or Post's Information tab.
- Hover the collapsed "Edit" section: border turns secondary.
- Click to open it: border turns secondary-dark (non-hovered).
- Hover it again while open: border turns secondary.
- Check another collapsible field elsewhere (e.g. an array/blocks field) still
  uses Payload's default neutral border, unaffected by this change.
- Check light and dark admin theme — the fallback hex colors aren't
  theme-aware, so confirm they still read clearly against both.
