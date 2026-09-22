# Pin the admin breadcrumb bar and site icon; contain scrolling like the Nav sidebar / collection list pages

**Type:** Fix

**Status:** verified

**Branch:** fix/pin-admin-breadcrumbs-site-icon

## The problem

Confirmed via clarification: this is about the Payload **admin** panel, not the
public site. The top admin chrome bar (`@payloadcms/ui`'s `AppHeader`, class
`.app-header`) holds the breadcrumb-style navigation trail (`StepNav`, e.g.
"Pages / Edit: Home") and this project's custom Site Icon
(`admin.components.graphics.Icon` in `src/payload.config.ts` ->
`src/custom/admin-branding/Component.tsx`'s `AdminIcon`, rendered inside
`StepNav` via `AppHeader`'s `CustomIcon` prop).

`.app-header` is `position: relative`
(`node_modules/@payloadcms/ui/dist/elements/AppHeader/index.scss`) - Payload's
own out-of-the-box behavior in this installed version, not something this
project changed. On any admin page with enough content to scroll (a long
document's fields, a long list view), scrolling carries `.app-header` off the
top of the viewport along with everything else, hiding the breadcrumb trail
and the site icon.

This is especially visible on the document edit view right now: `.doc-controls`
(the Save/eye-icon/title bar this project already customizes in
`src/custom/admin-timestamps/styles.css`) is *already*
`position: sticky; top: 0` by Payload's own default
(`node_modules/@payloadcms/ui/dist/elements/DocumentControls/index.scss`), so
it stays pinned once you scroll - but `.app-header` above it isn't, so it
disappears while doc-controls jumps up to occupy the very top of the viewport,
right where the breadcrumbs and site icon used to be.

## The fix

Add two rules to `src/custom/admin-timestamps/styles.css` (the project's
existing catch-all stylesheet for global admin-panel CSS, already loaded once
via the `AdminTimestampStyles` provider registered in
`admin.components.providers` - no new component needed):

1. `.app-header { position: sticky; top: 0; background-color: var(--theme-bg); }`
   Pins the breadcrumb trail and site icon to the top of the viewport across
   every admin page (dashboard, list views, edit views) - not just document
   edit views. The explicit `background-color` is necessary: confirmed neither
   `.app-header` nor its own `.app-header__bg` layer declares one anywhere in
   the installed `@payloadcms/ui` package - harmless while the bar sits in
   normal flow above the fold (nothing to show through), but once sticky,
   scrolled content underneath would bleed through without it. `var(--theme-bg)`
   matches the page's own background, same token `.template-default__wrap`
   already uses.
2. `.doc-controls { top: var(--app-header-height); }`
   `.doc-controls` is already sticky at `top: 0` by Payload's own default.
   Once `.app-header` also becomes sticky at `top: 0`, both would try to
   occupy the same viewport position - `.app-header`'s higher z-index
   (`var(--z-modal)`, 30 vs. doc-controls' 5) would sit on top of it rather
   than stacking below it. Offsetting doc-controls' sticky `top` by
   `--app-header-height` - a Payload root-level custom property Payload
   itself already resizes at its own `mid-break` breakpoint (confirmed:
   `calc(var(--base) * 2.8)` desktop, `* 2.4` at `max-width: 1024px`) - makes
   them stack correctly at every viewport width with no new breakpoint logic
   needed on this side.

Must not break: the mobile nav-toggler (also sticky at `top: 0`, a separate
column outside this flow, untouched), the header's localizer dropdown, the
Save/eye-icon-left-of-bar rules already added to this same stylesheet, and
every other existing rule in it (nav-group styling, block-highlight borders,
etc. - append, don't touch those).

Follow-up, after confirming the pin above worked: the user still sees the
*page itself* scroll (the browser's own page-level scrollbar moving) and
wants that eliminated entirely - "just like the Users page and the
Categories page", where the whole page currently already looks
non-scrolling (those two collections have few enough fields that content
fits in the viewport, so there's nothing to scroll to begin with). The ask
is to make every admin page behave that way structurally, regardless of how
much content it holds - not by literally preventing content overflow, which
isn't possible for a long document without clipping fields, but by
confining scrolling to a content pane instead of the whole browser page,
the same way the sidebar nav already works.

Confirmed in the compiled `@payloadcms/ui` styles: `.nav` (the sidebar) is
already built exactly this way - `position: sticky; top: 0; height: 100vh;
overflow: hidden;`, with its actual content in a nested `.nav__scroll {
height: 100%; overflow-y: auto; }`. The sidebar never lets the *page*
scroll on its account; it scrolls internally, capped to the viewport. The
main content column (`.template-default__wrap`, holding `.app-header` and
the current view underneath it) has no such cap today - it just grows as
tall as its content and lets the page (`body`/`html`) scroll to reach it,
which is why a short view (Users, Categories) never scrolls anything (its
content fits) while a long one (a document with many fields, a long list)
makes the whole page scroll.

Fix: give `.template-default__wrap` the same treatment `.nav` already has -
`height: 100vh; overflow-y: auto;`. That caps its box at the viewport height
and moves its overflow into its own scrollbar instead of the page's. Once
both grid items in `.template-default` (`.nav` and `.template-default__wrap`)
explicitly cap at `100vh`, the single implicit grid row - and so
`.template-default`'s own `min-height: 100vh` - resolves to exactly one
viewport height, and `body`/`html` have nothing left to scroll. `.app-header`'s
existing `position: sticky; top: 0` and `.doc-controls`'s `top:
var(--app-header-height)` keep working unchanged - sticky positioning only
needs *a* scrolling ancestor, not specifically the page, and
`.template-default__wrap` becomes that ancestor.

Checked for breakage: Payload's dropdown menus (`Popup`, e.g. the three-dot
menu) render through a React portal straight to `document.body` (confirmed in
`node_modules/@payloadcms/ui/dist/elements/Popup/index.js`), so they sit
outside `.template-default__wrap` entirely and are never clipped by its new
`overflow-y: auto`. Their position-tracking scroll listener is attached to
`window` with `{ capture: true }`, which fires for scroll events from any
descendant scrollable element (capture-phase listeners see events from
descendants regardless of bubbling) - so the dropdown still repositions
correctly when the new inner container scrolls, not just when the page
itself used to.

Must not break: the sidebar nav's own existing scroll behavior (untouched,
same pattern, just now mirrored one column over), any drawer/modal (portaled
to `document.body`, unaffected the same way Popup is), and everything from
the first part of this fix above.

Second follow-up: reported after step 2 that the page still scrolls as a
whole. Root cause found by re-reading the same Payload source rather than
guessing again: `.live-preview-window` (the iframe pane on a live-preview
edit view, e.g. Pages/Posts) ships with its own hardcoded sticky offset -
`position: sticky; top: var(--doc-controls-height); height: calc(100vh -
var(--doc-controls-height)); overflow: hidden;`
(`node_modules/@payloadcms/ui/dist/elements/LivePreview/Window/index.scss`).
That offset only ever accounted for `.doc-controls`' own height - it has no
idea `.app-header` now also sits above `.doc-controls` (step 1's fix moved
`.doc-controls`' own sticky `top` down to `var(--app-header-height)`, but
nothing told the iframe pane about that same shift). So on exactly the views
this session has been testing (Pages/Posts, anything with live preview), the
iframe pane is now positioned and sized as if `.app-header` doesn't exist -
likely the real source of "elements hidden under the site icon and
breadcrumbs": the iframe pane sitting `--app-header-height` too high,
overlapping the space `.app-header` now occupies.

Clarified goal, in the user's own words: make Pages/Posts editing screens
behave like the collection list pages (e.g. Users, Categories) - no
whole-screen scroll at all, with only the iframe and the fields/blocks panel
("the block") scrolling independently, each in its own box, rather than one
shared page-level scroll (or, from step 2, one shared content-column
scroll) carrying both.

Payload already does exactly this for the iframe pane alone - sticky, capped
height, own `overflow` - it's only missing the `--app-header-height` term.
The fields/blocks column (`.collection-edit__main`) gets no equivalent
treatment by default; it just flows normally and grows with its content,
which is what made the *shared* column scroll (from step 2) carry both
panes together instead of scrolling independently.

Fix, scoped to `.collection-edit--is-live-previewing` (fires for both
collections and globals when the live-preview iframe is open - same root
class step 1's fix on `.doc-controls` already keys off) and the same
`min-width: 1025px` guard already used for the Save/eye-icon-left rules
(below that width `.live-preview-window` stacks under the fields instead of
beside them, per its own SCSS, so there's no side-by-side split to give
independent scroll to):

- `.collection-edit__main { height: calc(100vh - var(--app-header-height) -
  var(--doc-controls-height)); overflow-y: auto; }` - caps the fields/blocks
  column to exactly the remaining viewport height below the two sticky bars
  and gives it its own scrollbar, matching what `.live-preview-window`
  already does for the iframe side.
- `.live-preview-window { top: calc(var(--app-header-height) +
  var(--doc-controls-height)); height: calc(100vh - var(--app-header-height)
  - var(--doc-controls-height)); }` - corrects Payload's own offset/height to
  finally include `--app-header-height`, matching the fields column's new
  box exactly so both panes start and end at the same place.

With both panes independently capped to fit within one viewport height below
the sticky bars, their combined natural height in the flow is exactly
`--app-header-height + --doc-controls-height + (100vh - --app-header-height
- --doc-controls-height)` = `100vh` - so `.template-default__wrap`'s own
`overflow-y: auto` (step 2) has nothing left to scroll on these views either;
scrolling happens only inside whichever pane the content overflows.

Must not break: the mobile/stacked live-preview layout below `min-width:
1025px` (untouched, same guard as the existing Save/eye-icon rules), a
document edit view *without* live preview (Users, Categories, Media - no
`.collection-edit--is-live-previewing` class, so unaffected, already handled
correctly by step 2 alone), and the popup preview window type (a separate
detached browser window, not this inline split).

Third follow-up: reported after step 3 that a live-preview document still
scrolls as a whole, with "no scrolling when the iframe is not showing" as the
key clue - narrowed down together with the user via direct DOM measurements
(`scrollHeight`/`clientHeight`/`offsetHeight` on the relevant elements,
pasted from their browser console, since this session has no way to load the
page itself):

- `html`/`body`/`.template-default`: no overflow - step 2 is correctly
  eliminating page-level scroll.
- `.template-default__wrap`: 500px of content in a 432px box - genuinely
  overflowing, confirming the user's report.
- `.collection-edit__main-wrapper`: exactly matched box (320/320) - step 3's
  split-pane sizing is working correctly; not the cause.
- `.app-header` (56/56) and `.doc-controls` (57/56, negligible) - both fine,
  ruling out the enlarged Site Icon or the bars' own sizing.
- Listing `.template-default__wrap`'s actual direct children (not
  something this session had ever inspected) surfaced the missing piece: a
  `<div class="gutter ... doc-header">`, offsetHeight 60px, sitting between
  `.app-header` and `.collection-edit` as its own sibling - not something
  this fix had accounted for anywhere. 56 + 60 + 376 (`.collection-edit`'s
  own total, `.doc-controls` 56 + main-wrapper 320) plus small margins lines
  up with the reported 500.

Root cause: `.doc-header` is Payload's `DocumentHeader` component
(`node_modules/@payloadcms/next/dist/elements/DocumentHeader/index.js`) - a
completely different package (`@payloadcms/next`, not `@payloadcms/ui`) from
everywhere else this fix has looked. It renders the document's title and its
tabs row (Edit/API/etc.), sits as a sibling of `.collection-edit` (not nested
inside it, and not part of `views/Edit` at all), and ships with
`position: relative` - no sticky, and Payload gives it no
`--doc-header-height` custom property the way it does for the other two bars
(its height is content-based: a title line plus tabs, if any, so it isn't a
fixed constant Payload could expose even if it wanted to). Being un-sticky,
it scrolls away normally - which is exactly the genuine, legitimate ~60px of
overflow the user is seeing and calling "still scrolling": everything below
`.app-header` has to scroll that distance before `.doc-controls` and the two
panes below it are actually flush against the pinned chrome above them.

Fix: make `.doc-header` sticky too, directly below `.app-header`, and shift
every offset that assumed only two bars (`app-header` + `doc-controls`) sit
above the split to account for three:

- `.doc-header { position: sticky; top: var(--app-header-height);
  background-color: var(--theme-bg); z-index: 10; }` - pins it in place
  (`z-index: 10`, between app-header's 30 and doc-controls' 5, so stacking
  stays correct once both are stuck with content scrolling underneath).
- `.doc-controls`'s `top` becomes `calc(var(--app-header-height) + var(--base)
  * 3)` instead of `var(--app-header-height)` alone.
- `.collection-edit__main` / `.live-preview-window`'s `top`/`height` calcs
  (step 3) gain the same `var(--base) * 3` term.

**Known approximation, flagged rather than hidden:** `var(--base) * 3`
(60px in this project's `--base: 20px`) is `.doc-header`'s *measured* height
on the document actually tested, not a value Payload exposes or guarantees.
It only holds as long as every live-preview-enabled collection/global in
this project renders the same one-line-title, same-tab-row shape (true today
for Pages, Posts, and the three live-preview globals - none has
drafts/versions enabled, confirmed earlier in this same session, so none
gets the extra tab Payload adds for that). If a title ever wraps to two
lines, or drafts/versions/API-view get enabled on one of these later,
`.doc-header`'s real height would grow past this constant, reopening a
smaller version of the same gap this step just closed. A fully robust fix
would measure `.doc-header` in JS and publish its own custom property, which
is a larger change than this fix's scope - flagged for a future pass if this
approximation ever drifts.

Must not break: everything from steps 1-3 above; `.doc-header` scrolling
normally on mobile is left alone (no media-query guard added to the new
sticky rule) - the whole admin layout already reflows to a single column at
Payload's mid-break, and that wasn't part of what was reported.

## Build steps

1. [x] Add the two rules above to `src/custom/admin-timestamps/styles.css`,
  with a short comment explaining why each is needed (no upstream
  background-color; the z-index/stacking conflict with the already-sticky
  doc-controls bar).
  **Done when:** on any admin page with enough content to scroll (a long
  document's fields, or a long list view), the breadcrumb trail and the site
  icon stay visible at the top of the viewport throughout the scroll; on a
  document edit view specifically, the Save/eye-icon/title bar stacks
  directly below the breadcrumb bar with no gap and no overlap, at both
  desktop and mobile (`--app-header-height`-appropriate) widths.
2. [x] Add `height: 100vh; overflow-y: auto;` to `.template-default__wrap`
  in the same stylesheet, with a comment explaining the parallel to `.nav`/
  `.nav__scroll` and why the Popup portal/scroll-listener behavior stays
  correct.
  **Done when:** on a short view (Users list, Categories list - matching
  what the user pointed to), nothing visibly changes. On a long view (a
  document with many fields, or a long list), the browser's own page-level
  scrollbar is gone entirely - the sidebar nav, `.app-header`, and (on an
  edit view) `.doc-controls` never move, and scrolling instead happens
  inside the content area below them, in its own scrollbar. A three-dot
  menu / other dropdown opened from a scrolled-down position still opens in
  the right place and tracks correctly if the content scrolls further while
  it's open.
3. [x] Add the `.collection-edit__main` and `.live-preview-window` rules
  above (guarded by `min-width: 1025px`) to the same stylesheet, with a
  comment explaining the root cause (the iframe pane's stale
  `--doc-controls-height`-only offset) and why both panes use the same
  `calc()`.
  **Done when:** on a Pages or Posts document (or a live-preview-enabled
  global) at desktop width, with live preview open: there is no page-level
  or shared-column scrollbar at all; the fields/blocks column and the iframe
  each scroll independently within their own box; the iframe pane's top edge
  sits flush against the bottom of `.doc-controls` with no gap and no
  overlap. A document/global edit view without live preview, and the
  narrow/mobile stacked layout, are both unchanged from step 2's behavior.
4. [x] Add the `.doc-header` sticky rule and the `var(--base) * 3` term to
  `.doc-controls`, `.collection-edit__main`, and `.live-preview-window`'s
  existing offsets, with a comment explaining the root cause (the
  previously-unaccounted `DocumentHeader` bar) and flagging the approximation
  the `var(--base) * 3` constant represents.
  **Done when:** on a Pages or Posts document (or a live-preview-enabled
  global) at desktop width, `.doc-header` (the title/tabs row) no longer
  scrolls away - it stays pinned directly below `.app-header`; `.doc-controls`
  sits flush below it with no gap/overlap; the fields/blocks pane and the
  iframe pane both start flush below `.doc-controls`; there is no remaining
  scrollbar anywhere except inside those two panes.
5. [x] Re-verified with the user via the same live `scrollHeight`/
  `clientHeight` measurement: overflow on `.template-default__wrap` dropped
  from 68px to a precise 8px, matching `.doc-header`'s own
  `margin-top: calc(var(--base) * .4)` exactly - `position: sticky` doesn't
  remove an element's margin from normal flow, so that margin still reserved
  space above `.doc-header` even once stuck. Added `margin-top: 0;` to the
  same `.doc-header` rule to close it.
  **Done when:** the same measurement snippet, re-run, shows no element
  outside `.collection-edit__main` and `.live-preview-window` reporting
  `scrollHeight > clientHeight` (both bars' own ~1px internal rounding
  aside).

## Verify

- Open a document with enough fields to scroll (or a long collection list
  view) in `/admin`, scroll down - confirm the breadcrumb trail (e.g. "Pages /
  Edit: Home") and the site icon stay visible at the top instead of scrolling
  away, with no page content visible through/behind the bar.
- On a document edit view, scroll down - confirm the Save/eye-icon/title bar
  sits directly under the breadcrumb bar, no gap, no overlap.
- Narrow the browser to a mobile width and repeat - confirm the same stacking
  holds at the smaller `--app-header-height`.
- Confirm the sidebar nav, its mobile hamburger toggle, and the localizer (if
  localization is enabled) still behave normally.
- Open the Users list and the Categories list - confirm both look and behave
  exactly as before (short content, nothing to scroll).
- Open a document with many fields (or a long list view) - confirm there is
  no browser-level/page scrollbar; the sidebar nav, breadcrumb bar, and (on
  an edit view) the Save/eye-icon bar stay completely still while the
  content beneath them scrolls in its own contained area.
- With that content scrolled partway down, open the three-dot overflow menu
  (or another dropdown) - confirm it opens in the correct position, and
  repositions correctly if you scroll further while it's open.
- Open a Pages or Posts document with live preview on, at desktop width -
  confirm there is no page-level or shared scrollbar; scroll the fields/blocks
  column and confirm only it scrolls, the iframe stays put; scroll inside the
  iframe and confirm only it scrolls, the fields column stays put. Confirm
  the iframe's top edge lines up exactly with the bottom of the Save/eye-icon
  bar - no gap, no overlap with `.app-header` above it.
- Repeat on a live-preview-enabled global (Header, Footer, or Settings).
- Open a document/global with no live preview (Users, Categories, Media) -
  confirm it still behaves exactly as step 2 left it (single contained
  scroll, no page-level scrollbar).
- Narrow to mobile width on a live-preview document - confirm the iframe and
  fields stack normally (Payload's own mid-break behavior), not artificially
  height-capped.
- Open a Pages or Posts document at desktop width, scroll down - confirm the
  document title/tabs row (`.doc-header`) stays pinned directly below the
  breadcrumb bar instead of scrolling away, and there is no remaining
  scrollbar anywhere except inside the fields/blocks pane and the iframe.
- In the browser console, re-run the same `scrollHeight`/`clientHeight`
  measurement used to diagnose this
  (`document.querySelector('.template-default__wrap')` and its children) and
  confirm no element reports `scrollHeight > clientHeight` outside the two
  panes.
- Repeat on the three live-preview globals (Header, Footer, Settings) and on
  Posts specifically - confirm `.doc-header`'s actual height still matches
  the `var(--base) * 3` estimate (no tab row that wasn't there when this was
  measured). If any of them shows a visible gap or overlap around
  `.doc-controls`, that view's `.doc-header` is taller than assumed and the
  constant needs revisiting.
