# Flip live preview layout: iframe left, blocks right; move Save/eye icon left (Save first)

**Type:** Fix

**Status:** verified

**Branch:** fix/flip-live-preview-layout

## The problem

In the Payload admin edit view (Pages/Posts collections, Header/Footer/Settings
globals - anywhere `admin.livePreview` is enabled), the split-screen live
preview always renders the document form (fields/blocks) on the left and the
preview iframe on the right. That's Payload's own default layout
(`@payloadcms/ui`'s `views/Edit`: `.collection-edit__main-wrapper` is a plain
`display: flex` row containing `.collection-edit__main` - the form/blocks -
first, then the `LivePreviewWindow` iframe second). There's no built-in config
option to swap that order.

## The fix

Add a CSS override that reverses the flex order of `.collection-edit__main-wrapper`
so the iframe renders on the left and the form/blocks render on the right,
without changing either pane's width (~60% iframe / ~40% form, Payload's own
proportions).

- Add the rule to `src/custom/admin-timestamps/styles.css` - the project's
  existing catch-all stylesheet for global admin-panel CSS, already loaded
  once via the `AdminTimestampStyles` provider registered in
  `admin.components.providers` (`src/payload.config.ts`). No new component or
  provider registration needed.
- Scope the selector to `.collection-edit--is-live-previewing .collection-edit__main-wrapper`.
  Payload adds that root modifier class only when live preview is active *and*
  rendering as an inline iframe (`previewWindowType === 'iframe'`) - confirmed
  in `node_modules/@payloadcms/ui/dist/views/Edit/index.js`. This leaves the
  popup preview window type (a separate detached browser window, no
  side-by-side layout to flip) and every other collection/global's normal edit
  view untouched.
- The rule itself: `flex-direction: row-reverse;` on that wrapper. Reversing
  the flex order swaps visual position while leaving each child's own width
  rule (`.collection-edit__main` at effectively ~40%, `.live-preview-window`
  at a fixed 60%) exactly as Payload computed it - only left/right position
  moves.
- Must not break: normal (non-live-preview) edit views, the popup preview
  window type, or the existing rules already in that stylesheet (nav-group
  styling, block-highlight borders, etc. - append, don't touch those).

Second, related change to the same top document-controls bar: the live-preview
eye toggle and the main Save button should visually sit on the left side of
the bar, not pinned to the right where Payload always puts them.

- First attempt: equal `order: -1` on the eye toggle and the Save button's
  flex-item wrapper, scoped to `.doc-controls__controls` (the small
  right-side button group they sit in - see selectors below). Confirmed a
  no-op in practice - Payload's layout pins that *entire* group to the right
  end of the bar (`.doc-controls__content`, the title/status block, has
  `flex-grow: 1` and comes first in `.doc-controls__wrapper`, pushing
  `.doc-controls__controls-wrapper` - eye, Save, and the three-dot menu - to
  the far right); reordering *within* that already-rightmost group doesn't
  move the group itself.
- Follow-up: Save should sit to the left of the eye icon (Payload's own DOM
  order is the reverse - eye toggle, then Save). Split the equal `order: -1`
  into two values - Save's wrapper gets `order: -2`, the eye toggle keeps
  `order: -1` - so Save wins the tie-break and renders first. Still correct
  if a classic Preview link or take-over button is ever added to the same
  group; they keep the default `order: 0` and fall in behind both.
- Second attempt: `flex-direction: row-reverse` on `.doc-controls__wrapper`
  itself, one level up (same technique as the iframe/blocks flip above). This
  does move the eye icon and Save button to the left, but drags the three-dot
  overflow menu along with them - both live inside the same
  `.doc-controls__controls-wrapper` box, and a plain `row-reverse` can't
  separate them. Rejected: the dot-menu must stay on the right.
- Actual fix: `display: contents` on `.doc-controls__controls-wrapper`. This
  removes *only its own box*, not its children - `.doc-controls__controls`
  (the eye+Save group) and the three-dot menu's `Popup` become direct flex
  items of `.doc-controls__wrapper` itself, alongside `.doc-controls__content`
  (the title/status block), each independently orderable. The three-dot
  `Popup` renders through a React portal and positions its dropdown from
  `getBoundingClientRect()` on its own trigger button (confirmed in
  `node_modules/@payloadcms/ui/dist/elements/Popup/index.js`) - it doesn't
  depend on `.doc-controls__controls-wrapper` as a CSS positioning context, so
  removing that box doesn't affect it.
- `.doc-controls__controls` then gets `order: -1` to move it before the
  title/status block; the three-dot menu is left at its default order, so it
  keeps its natural DOM position - after the title/status block, i.e. still
  right-most in the bar.
- Guard with `@media (min-width: 1025px)` (Payload's own `mid-break`,
  `@payloadcms/ui/dist/scss/vars.scss`). Below that width,
  `.doc-controls__controls-wrapper` becomes a fixed-height bottom toolbar with
  its own background/border (that package's `index.scss`, mid-break block),
  which `display: contents` would break.
- Follow-up: this was first scoped to `.collection-edit--is-live-previewing
  .doc-controls__controls-wrapper` / `.doc-controls__controls`, so it only
  applied while the live-preview iframe was actually open - toggling it off
  snapped Save and the eye icon back to the right. Per request, they should
  stay left regardless of whether the iframe is showing. Removed that scope:
  the rule now applies to every collection/global edit view unconditionally
  (still gated by the `min-width: 1025px` media query above). On a view with
  no live preview configured at all, `#live-preview-toggler` never renders,
  so only the Save button moves - consistent with the same request.

## Build steps

1. [x] Add the `row-reverse` rule to `src/custom/admin-timestamps/styles.css`,
   with a short comment explaining the selector scoping (why `--is-live-previewing`
   only fires for the iframe type, referencing the Payload source file
   checked above) so a future reader doesn't have to re-derive it.
   **Done when:** opening the admin edit view for a page/post (or the
   Header/Footer/Settings globals) with live preview active shows the preview
   iframe on the left and the document form/blocks panel on the right, at the
   same ~60/40 proportions as before; a normal edit view with live preview
   closed, and the popup preview window type if triggered, are visually
   unchanged.
2. [x] Add the two `order` rules (Save button wrapper at `-2`, eye toggle at
   `-1`, so Save renders first) to the same stylesheet, with a short comment
   on why each selector targets the actual flex item and why Save gets the
   more negative value.
3. [x] Add the `display: contents` + `order: -1` rules (guarded by the
   `min-width: 1025px` media query) to the same stylesheet, with a comment
   explaining why the step-2 `order` rules alone were a no-op, why the plain
   `row-reverse` alternative was rejected (drags the dot-menu along), and why
   `display: contents` is safe for the portaled `Popup`.
   **Done when:** on a document edit view with live preview active, at a
   desktop viewport width, the Save button and eye icon appear on the left
   side of the top bar in that order (Save first), the title/status block
   sits between them and the three-dot menu, and the three-dot menu stays on
   the right exactly where it was; a normal edit view with live preview off,
   or one where live preview isn't configured, keeps everything on the right
   exactly as before; a narrow (mobile-width) live-preview view keeps
   Payload's normal stacked/bottom-bar layout unchanged.
4. [x] Remove the `.collection-edit--is-live-previewing` scope from the
   step-3 selectors so Save and the eye icon stay left regardless of whether
   the live-preview iframe is currently open, with a comment explaining why
   (toggling the iframe off previously snapped them back right) and that
   views without live preview configured at all still only move the Save
   button, since the eye icon never renders there.
   **Done when:** on a document edit view where live preview is configured
   but currently toggled off (iframe not showing), the Save button and eye
   icon are still left-most in the bar in that order, and the three-dot menu
   is still on the right; a document with no live preview configured at all
   still shows Save left-most; the live-preview-active and narrow-viewport
   behavior from step 3 is unchanged.

## Verify

- Run `npm run dev`, open a Pages or Posts document in the admin, enable live
  preview (iframe type) - confirm the iframe is now on the left, the
  form/blocks panel on the right.
- Repeat for one global with live preview enabled (Header, Footer, or
  Settings).
- Toggle live preview off - confirm the normal single-column edit view is
  unaffected.
- If reachable, check the popup preview window type still opens as a separate
  window rather than an inline flipped pane.
- On a live-preview-active view at desktop width, confirm the Save button and
  eye icon appear on the left side of the top bar in that order (Save first,
  then the eye icon), the title/status block is next, and the three-dot menu
  stays on the right.
- Open the three-dot menu on that same view - confirm its dropdown (Duplicate,
  Delete, etc.) still opens and positions correctly.
- On that same document, toggle live preview off (iframe closes) - confirm
  the Save button and eye icon stay left-most in the bar, in the same order,
  and the three-dot menu stays right.
- Open a document/global with no live preview configured at all (e.g. Users,
  Media, or Categories) - confirm the Save button is left-most in the bar (no
  eye icon renders there).
- Narrow the browser below ~1024px on a live-preview view - confirm Payload's
  normal mobile stacked layout (controls as a bottom bar) is unchanged.
