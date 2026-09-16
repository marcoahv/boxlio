# Current Feature

**Title:** Footer logo doesn't swap on inverse surface or dark mode
**Type:** Fix
**Status:** verified
**Branch:** `fix/footer-logo-theme-swap`

### The problem

The footer always shows the light-background logo, even when the footer's
own surface is set to Inverse, or the visitor/editor is in dark mode. Two
separate gaps cause this:

1. **`src/globals/Footer/Component/index.tsx`** only forwards `header.logo`
   to `FooterClient` (`logo={header.logo}`, line 23) — it never reads or
   passes `header.logoDark`. `Logo.tsx` (shared with the header,
   `src/globals/Header/Component/Logo.tsx`) falls back `logoDark` to `logo`
   whenever no `logoDark` is supplied, so the footer's second `<img>` is
   always identical to the first.
2. **No CSS ever makes the footer's dark image visible.** Even with
   `logoDark` wired through, `.ui-logo__img--logo-dark` starts at
   `display: none` (`elements/_logo.css`) and only the header's own
   stylesheet (`src/globals/Header/Component/_header.css`, the "--- Logo
   ---" block, lines ~40-107) turns it back on — and only under
   `.header[data-surface=...]` selectors. `src/globals/Footer/Component/
   _footer.css` has no equivalent rule at all, so the footer's dark image
   never becomes visible under any surface or theme.

The header already solves exactly this problem for its own two surfaces
that need a swap (`default` and `inverse` — `muted`/`accent` are fixed
light-ish backgrounds in both OS schemes per the comment at
`_header.css:40-46`, so they never need `logoDark`). The footer uses the
same four-surface picker (`_footer.css` mirrors `_section.css`'s
surface/spacing mapping) and the same `--color-surface*` tokens
(`_alias-tokens.css`), so the identical logic applies unchanged — only the
selector root (`.footer` instead of `.header`) differs. The footer has no
transparent/overlay-over-hero behavior like the header's `body:has(...)`
block, so none of that part carries over.

### The fix

Wire `logoDark` through the footer's data flow and add the footer's own
copy of the header's surface+theme swap rules, without touching
`Header.logo` / `Header.logoDark` field data, the header itself, or the
`Logo.tsx` component's fallback behavior:

- **`src/globals/Footer/Component/index.tsx`** — pass
  `logoDark={header.logoDark}` to `FooterClient` alongside the existing
  `logo={header.logo}`.
- **`src/globals/Footer/Component/FooterClient.tsx`** — accept a
  `logoDark?: string | Media | null` prop and forward it to `<Logo logo={logo}
  logoDark={logoDark} className="footer__logo" />` (currently only `logo` is
  passed).
- **`src/globals/Footer/Component/_footer.css`** — add a "--- Logo ---"
  block mirroring `_header.css`'s lines ~48-107 exactly, with every selector
  root changed from `.header` to `.footer`: the two `@media
  (prefers-color-scheme)` blocks for `default`/`inverse`, plus all four
  `html[data-theme='light'|'dark'] .footer[data-surface='default'|'inverse']
  .ui-logo__img--logo(-dark)` override rules. Skip the header's
  transparent-overlay/`body:has(...)` section entirely — the footer isn't a
  floating bar over a hero section, so that mechanism doesn't apply to it.
- Must not break: the header's own logo swap and CSS (untouched files), the
  footer's copyright/nav content and layout, and the footer showing `logo`
  correctly (via `Logo.tsx`'s existing fallback) when no `logoDark` is
  uploaded at all.

### Build steps

1. [x] Thread `logoDark` from `Footer/Component/index.tsx` through
   `FooterClient.tsx` into `<Logo>`, and add the mirrored surface+theme swap
   block to `_footer.css`.
   Done when: with a `Header.logoDark` asset uploaded, the footer set to
   Default surface shows `logo` in light mode / `logoDark` in dark mode; set
   to Inverse it shows `logoDark` in light mode / `logo` in dark mode; set to
   Muted or Accent it always shows `logo` in either mode — matching the
   header's own behavior at each surface — and `npm run build` / `npm run
   lint` pass with no new warnings.

### Verify

`npm run dev`, then in `/admin` confirm the Header global has a Logo (dark
mode) asset uploaded that's visibly different from the main Logo. In the
Footer global, check each surface option in the browser (toggle OS/browser
color scheme, or devtools rendering emulation, for each):

- Footer surface Default: `logo` in light mode, `logoDark` in dark mode.
- Footer surface Inverse: `logoDark` in light mode, `logo` in dark mode.
- Footer surface Muted or Accent: always `logo`, either scheme.
- Clear the Logo (dark mode) field entirely: the footer still renders `logo`
  correctly in every case (no missing image).
- Visit the public header in both light and dark and confirm it's
  unchanged.
