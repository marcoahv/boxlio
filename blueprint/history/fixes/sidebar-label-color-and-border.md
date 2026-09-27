# Current Feature

**Title:** Dark gray, bordered labels in the admin's main sidebar
**Type:** Fix
**Status:** verified
**Branch:** `fix/sidebar-label-color-and-border`

## The problem

The admin's main sidebar nav group headings (Content/Collections/Globals)
already have a custom background treatment in
`src/custom/admin-timestamps/styles.css` (`.nav-group__toggle`), but it's
colored with the frontend's `secondaryColorDark` default (`#137c95`, a
blue/teal), a literal fixed value unrelated to the admin's own neutral gray
badge convention used elsewhere (`.field-label--sidebar-badge` in
`src/app/(payload)/custom.scss`, for Hero's Layout tab labels). Each group also
had no border around it.

(An earlier pass at this fix added a second, conflicting set of `.nav-group`/
`.nav-group__label` rules directly in `custom.scss`, not realizing this
existing, more complete implementation lived in `admin-timestamps/styles.css`.
Those duplicate rules have been removed - this is now the one place the main
sidebar's group styling lives.)

## The fix

Edit the existing rules in `src/custom/admin-timestamps/styles.css`:

- `.nav-group__toggle`: change `background` from `#137c95cc` (secondary dark,
  blue/teal) to a flat `#374151` (the same dark gray
  `.field-label--sidebar-badge` uses), and its `:hover`/`:focus-visible`
  background from `#137c9580` to a lighter flat gray (`#4b5563`) instead of an
  alpha-blended overlay - solid colors read correctly in both the admin's
  light and dark themes regardless of what's underneath.
- `.nav-group`: add a border around the whole group (heading + the links under
  it) - `1px solid var(--theme-elevation-150)`, small border-radius, padding -
  one border per group, not per link, matching
  `.field-label--sidebar-badge`'s existing border treatment.

White label/chevron text (`color: #fff` on `.nav-group__toggle`,
`.nav-group__indicator svg .stroke { stroke: #fff }`) and the label's
font-size/weight are unaffected. Individual links (`.nav__link`) and the
group's indent (`.nav-group__content`) are unaffected.

Must not break: group collapse/expand toggle behavior, the active-link
indicator bar (`.nav__link-indicator`), the branded icon sizing
(`.step-nav__home`), and the mobile (below 768px) full-width nav layout.

### Build steps

**Step 1 - recolor and border the main sidebar's groups**

- `src/custom/admin-timestamps/styles.css`: swap `.nav-group__toggle`'s
  resting/hover backgrounds for the two flat grays above, and add the border
  to `.nav-group`. Update the file's own comment to explain the new color
  source and the added border.
- `src/app/(payload)/custom.scss`: remove the earlier, now-redundant
  `.nav-group` / `.nav-group__label` rules added by mistake before this
  existing implementation was found.

Done when: opening `/admin` shows each main-sidebar group (Content,
Collections, Globals) as one bordered box, with its heading on a dark gray
background (not blue/teal) and white text - in both light and dark mode, and
at both desktop and mobile nav widths.

**Step 1 status: done.**

**Step 2 - widen the main sidebar a little**

- `src/app/(payload)/custom.scss`: bump the existing `--nav-width` override
  (above the 769px breakpoint) from `178.75px` to `209px` - now that each
  group renders as a bordered, padded box, the narrower width felt tight per
  request.

Done when: the main sidebar at desktop widths (≥769px) is visibly wider
than before, mobile nav (<768px, still full-width) is unaffected.

**Step 2 status: done.**

**Step 3 - background highlight instead of underline on nav link hover**

- `src/custom/admin-timestamps/styles.css`: override `.nav__link:hover` /
  `:focus-visible` to `text-decoration: none` plus a
  `var(--theme-elevation-100)` background (theme-reactive, matching other
  hover surfaces in this admin file) instead of Payload's default underline.

Done when: hovering or focusing a collection/global link in the main sidebar
(Posts, Pages, Media, etc.) shows a background highlight, not an underline.

**Step 3 status: done.**

**Step 4 - keep the hover background on the currently selected link**

- `src/custom/admin-timestamps/styles.css`: add `.nav__link.active` (Payload's
  own class for the current-page link) to the same hover/focus background
  rule from step 3, so the current link keeps that highlight permanently
  instead of it only showing on hover/focus.

Done when: the sidebar link for the page currently open shows the same
background highlight at rest, not just while hovered.

**Step 4 status: done.**

## Verify

- Open `/admin` and check the left nav: each group (Content, Collections,
  Globals) is one bordered box, and its heading background is dark gray, not
  blue/teal.
- Hover/focus a group heading and confirm it steps to the lighter gray, not
  the old teal tint.
- Toggle light/dark mode and confirm the border and both background steps
  stay legible in both (fixed grays + white text, so unaffected by the admin
  theme toggle; the border uses the theme-reactive elevation token).
- Resize below 768px and confirm the mobile nav still opens/closes normally
  with the same styling.
- Click a nav item and confirm the active-state indicator bar still works and
  individual links are unaffected.
- At desktop widths, confirm the sidebar reads as noticeably wider than
  before; at mobile widths (<768px) confirm it's still full-width, unchanged.
- Hover and keyboard-focus a nav link (e.g. Posts) and confirm it shows a
  background highlight instead of an underline.
- Open a page whose link is the current one (e.g. Posts list) and confirm
  that link keeps the highlight background even when not hovered.

## Checks run

- `npm run lint` - clean (4 pre-existing warnings, unrelated to this change)
- `npm run build` - compiled successfully

Not yet confirmed live in a browser (no dev server was started this session) -
run `/check` or open `/admin` yourself to confirm the visual result described
above.
