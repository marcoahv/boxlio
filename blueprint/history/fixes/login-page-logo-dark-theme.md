# Current Feature

**Title:** Login page logo is backwards in dark admin theme
**Type:** Fix
**Status:** verified
**Branch:** `fix/login-page-logo-dark-theme`

### The problem

The admin login page's logo (`src/custom/admin-branding/Component.tsx` -
`AdminLogo`) always renders `Header.logo` — the site's light-background logo —
no matter what theme the Payload admin panel is in. When an editor's admin
panel is in dark mode, the login page still shows the light-background logo,
so it reads as the wrong (dark-text-on-dark-background) logo. Light admin
theme is fine today because `Header.logo` is the correct asset for a light
background.

`Header.logo` / `Header.logoDark` already exist and are already used
correctly on the public site header (`src/globals/Header/Component/Logo.tsx`
+ `_header.css`), which picks between the two based on the frontend's own
light/dark state. Swapping which asset `AdminLogo` reads from on the backend
would break that already-correct header, so the swap must happen for the
login page specifically, the same way the header does it: render both
images and let CSS choose the visible one for the *admin panel's* theme.

### The fix

Make `AdminLogo` theme-aware for the Payload admin panel's own theme, without
touching `Header.logo` / `Header.logoDark` field data at all:

- Fetch both `header.logo` and `header.logoDark` in `getHeaderLogoSafely`
  (falls back to `logo` when no dark variant is uploaded, same fallback
  `Logo.tsx` already uses on the frontend).
- Render both as stacked `<img>` elements (mirroring
  `src/globals/Header/Component/Logo.tsx`'s two-image pattern) instead of a
  single `<img>`.
- Add a small CSS file scoped to this component (imported directly in
  `Component.tsx`, same pattern as `src/custom/table/cells-horizontal.css`)
  that toggles which image is visible based on Payload's own admin theme
  attribute: `prefers-color-scheme` for the auto case, plus
  `html[data-theme='light']` / `html[data-theme='dark']` overrides for an
  editor's explicit admin theme choice (Payload's `ThemeProvider` sets
  `data-theme` on `<html>` the same way the frontend does — confirmed in
  `node_modules/@payloadcms/ui/dist/providers/Theme/index.js`).
- Must not break: the public header logo swap, the light-theme login page
  (already correct today), and the Payload-stock-logo fallback when no
  `Header.logo` is uploaded at all.

### Build steps

1. [x] Update `src/custom/admin-branding/Component.tsx` to fetch both logo
   variants and render them as two stacked images with distinguishing
   classes; add the small companion CSS file with the `prefers-color-scheme`
   + `html[data-theme]` visibility rules and import it at the top of
   `Component.tsx`.
   Done when: admin panel set to dark theme shows `Header.logoDark` (or
   `Header.logo` if no dark variant is uploaded) on the login page, admin
   panel set to light theme still shows `Header.logo`, and the public site
   header is visually unchanged.

### Verify

- Log out of `/admin`. With the OS in light mode and no explicit admin theme
  cookie, confirm the login logo matches today's (light) appearance.
- In the admin panel, switch the theme toggle to Dark, reload the login page
  (or open it in a private window with the theme cookie set to dark) and
  confirm it now shows `Header.logoDark` instead of the dark-on-dark
  `Header.logo`.
- Switch back to Light and confirm it reverts correctly.
- Visit the public site header in both light and dark and confirm no change
  in behavior there.
