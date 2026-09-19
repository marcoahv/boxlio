# Current Feature

**Title:** Sidebar field border flashes instead of staying highlighted while selected in the preview
**Type:** Fix
**Status:** verified
**Branch:** `fix/persistent-field-focus-highlight`

## The problem

When an editor clicks/selects an editable text element in the Live Preview
iframe, the matching sidebar field's border is supposed to draw the eye to
where the field landed. Instead it flashes blue 2-3 times over about a
second, then goes fully back to normal - even while the field is still
selected in the preview.

Cause: `src/custom/block-field-sync/Component.tsx`'s `scrollToAndHighlight`
applies `.field-jump-highlight`
(`src/custom/block-field-sync/styles.css`), whose `block-field-sync-jump`
keyframes explicitly pulse the outline color in and out twice
(`animation: block-field-sync-jump 600ms ease-in-out 2`) and always end back
at `outline-color: transparent`. The class is removed the moment that
animation's `animationend` fires - there's no state that says "this field is
still the one selected in the preview," only a one-shot flash triggered per
`block-field-focus` message.

## The fix

Make the highlight track live selection instead of firing a fixed-count
flash:

- In `src/custom/block-field-sync/styles.css`, replace the
  `block-field-sync-jump` `@keyframes` and its 2-iteration animation with a
  plain, persistent outline style - present while the class is applied, gone
  the instant it's removed. Rename the class from `.field-jump-highlight` to
  `.field-focus-highlight` since it's no longer a jump flash; update the
  matching constant and both usages in `Component.tsx`.
- In `Component.tsx`, `scrollToAndHighlight` keeps scrolling the field into
  view exactly as now, but only *adds* the highlight class - it no longer
  clears it itself (no more `animationend` listener to remove).
- Track the currently highlighted element in a ref (parallel to the existing
  `ownedRef`/`activeFieldKeyRef` pattern already in this component) so it can
  be cleared from three places:
  - **A different field gets focus** - clear the previous field's highlight
    immediately (don't wait for its blur's grace period) before highlighting
    the new one, so switching fields in the preview never shows two
    highlighted fields at once.
  - **The focused field blurs** - clear it in the same
    `BLUR_GRACE_MS`-delayed callback that already collapses the accordion on
    blur (the existing "moving between two fields in the same block
    shouldn't read as done editing" grace period applies identically here),
    unless a newer focus has already superseded it.
  - **The component unmounts** - clear any residual highlight in the
    existing cleanup, alongside `cancelPendingBlur`/`cancelPendingFocusRetry`.

### Must not break

- The scroll-into-view behavior on focus is unchanged.
- The accordion expand/collapse and its own timing (`EXPAND_ANIMATION_MS`,
  `BLUR_GRACE_MS`, the retry-until-reachable walk from the previous fix) are
  untouched - this only changes what happens to the highlight class.
- Only one field is ever highlighted at a time.

## Build steps

- [x] In `src/custom/block-field-sync/styles.css`, replace the flashing
      `@keyframes`/animation with a persistent outline style under the
      renamed `.field-focus-highlight` class. In
      `src/custom/block-field-sync/Component.tsx`, rename
      `JUMP_HIGHLIGHT_CLASS` to `FOCUS_HIGHLIGHT_CLASS`, stop clearing it via
      `animationend` in `scrollToAndHighlight`, add a ref tracking the
      currently highlighted element, and clear it on next-field-focus,
      blur's existing grace-period callback, and unmount cleanup.
      **Done when:** clicking an editable field in the Live Preview iframe
      shows a steady (non-flashing) blue outline on the matching sidebar
      field that stays while that field remains focused in the preview, and
      disappears shortly after it's blurred there (or immediately when a
      different field is focused instead) - verified in a real browser.

## Verify

- Click into an editable text field in the Live Preview iframe: the matching
  sidebar field gets a solid blue outline with no flashing, and it stays
  outlined while you keep typing/stay focused there.
- Click a different editable field in the same or another block: the first
  field's outline clears and the new one is outlined - never both at once.
- Click out of the iframe entirely (blur): the outline clears shortly after,
  same timing as the existing accordion auto-collapse.
- The accordion expand-on-focus and stays-open-while-editing-in-preview
  behavior from the prior fixes is unaffected.

## Verification record

Driven against the running dev server with Playwright/Chrome:

| Check | Result |
| --- | --- |
| Focus a field in the preview | Solid outline appears immediately, `getComputedStyle(...).animationName === "none"` |
| Stays focused 1.5s later | Outline unchanged, no flash, no color pulsing |
| Focus a different field | Previous field's outline clears immediately; only the new field is outlined |
| Blur (click out of the iframe) | Outline clears shortly after, same `BLUR_GRACE_MS` timing as the accordion auto-collapse |
| Prior accordion-expand fixes | All 4 checks (fresh-refresh expand, nested `features.N.title`, stays-open-in-preview, still-auto-collapses-outside-preview) re-verified passing after this change |

Automated gates: `npm run lint` (0 errors, 4 pre-existing warnings),
`npm run test:int` (8 files, 60 tests passing), `npm run build` (compiled
successfully).
