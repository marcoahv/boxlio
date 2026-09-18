# Current Feature

**Title:** Live-preview field focus must expand a never-opened block accordion, and must not trip the idle auto-collapse
**Type:** Fix
**Status:** verified
**Branch:** `fix/accordion-expand-after-refresh`

## The problem

Two defects, both confirmed by driving the real admin app in Chrome against
the running dev server (console/DOM evidence quoted below).

### Problem 1 - nothing expands after a browser refresh

Clicking editable text in the Live Preview iframe is supposed to expand that
block's "Edit" accordion in the sidebar. After a hard refresh it does
nothing.

The `block-field-focus` postMessage **does** arrive - messaging is not the
problem:

```
[TOP+7220ms] MSG-RECEIVED block-field-focus origin=http://localhost:3000
             blockId=6a9bb2d8fff40208137f8a22 fieldPath=heading
```

The real cause: **Payload's collapsible does not render its children until it
has been expanded at least once.** On a freshly loaded page the only block
field elements in the DOM are the hidden ids:

```
fieldIds: field-blocks__0__id, field-blocks__1__id,
          field-blocks__2__id, field-blocks__3__id     (no __heading, etc.)
```

But `src/custom/block-field-sync/Component.tsx` resolves the *field* element
first (`document.getElementById('field-blocks__0__heading')`) and only then
derives what to expand from it (`findAncestorCollapsibles(target)`). It needs
the field to already be visible in order to make it visible - a chicken-and-egg
dependency. The handler finds `null` and bails.

This also explains why the earlier retry attempt (polling for that element)
changed nothing: the element never appears on its own. And it explains the
"works until I refresh" symptom - once an accordion has been opened by hand,
its fields stay mounted in the DOM even after it is collapsed again, so every
later lookup succeeds for the rest of that page's life.

### Problem 2 - an open accordion closes when you click into the preview

With an accordion already open, moving the mouse to the preview and clicking
an element collapses it. Captured sequence:

```
+9807  MOUSE-LEFT-ACCORDION-WRAPPER blocks-row-0
+9812  WINDOW-BLUR active=IFRAME#live-preview-iframe
+9825  ACCORDION blocks-row-0 -> COLLAPSED     <- React state, no click
+9825  MSG-RECEIVED block-field-focus
+9826  PROGRAMMATIC-CLICK ... clickToggle <- reconcileExpanded <- BlockFieldSync
+9828  ACCORDION blocks-row-0 -> EXPANDED
```

The collapse at +9825 is `InformationTabEditAutoCollapse`'s `attemptToLeave()`
(`src/custom/information-tab-edit-autocollapse/Component.tsx`). When focus
enters the Live Preview iframe, the top-level document's `activeElement`
becomes the `<iframe>` element itself, which is not inside the accordion
wrapper - so `mouseleave` plus `focusout` read as "the editor left this
accordion" and it closes. Above, `BlockFieldSync` re-opened it 3ms later, so
the net result looked correct; with real mouse timing the collapse frequently
lands last and the accordion stays shut. It also makes `BlockFieldSync` take
ownership of an accordion the editor opened by hand, so a later blur collapses
something it should have left alone.

## The fix

### Fix 1 - drive expansion from the block row, not from the field element

In `src/custom/block-field-sync/Component.tsx`, the `block-field-focus`
handler must start from what is always in the DOM - the block's row element
(`blocks-row-N`, found via the existing `findRowElementForBlockId`) - and
expand downward, rather than starting from a field element that cannot exist
yet:

- Expand the row's own collapsed ancestors and the row's "Edit" accordion
  (`.block-edit-collapsible > .collapsible` within that row), all of which
  render regardless of collapsed state.
- Because children mount only after a level opens, this has to iterate: after
  expanding what is currently reachable, wait for the DOM to settle, then look
  again for the target field and for any still-collapsed collapsible between
  the row and it. Repeat until the field is reachable and visible, or a bounded
  cap is hit. This is what makes nested paths such as `features.0.title` work,
  since the array row's own collapsible only exists once "Edit" is open.
- Keep the existing ownership model: `ownedRef` records only what this
  component expanded, so a blur collapses only those and never something the
  editor opened by hand.
- Keep the existing scroll-and-highlight, run after the field is actually
  present.

### Fix 2 - the preview iframe is not "leaving"

In `src/custom/information-tab-edit-autocollapse/Component.tsx`, focus sitting
inside the Live Preview iframe must not count as having left the accordion:
`attemptToLeave()` returns early when the top document's `activeElement` is the
live-preview iframe element. This covers both the `mouseleave` and `focusout`
paths, since both funnel through `attemptToLeave()`. Every other auto-collapse
trigger (moving to another field, switching tabs, leaving the sidebar without
entering the preview) keeps its current behavior, as do the unsaved-changes
nudge and the tab-switch guard.

Share the existing `live-preview-iframe` id constant rather than duplicating
the string - it already exists in `src/utilities/postToLivePreviewIframe.ts`.

### Watch for

Right after a hard refresh, `InformationTabEditAutoCollapse`'s mount effect
force-collapses an accordion that mounts already-open while the form is still
initializing (`setTimeout(() => toggle(), 400)`). If Fix 1 expands an accordion
during that window, that timer can close it again ~400ms later. Verify this in
the browser after Fix 1 lands and address it only if it actually fires.

**Outcome:** it did not fire. An accordion expanded immediately after a hard
refresh stayed open across the full observation window, so no extra handling
was needed.

## Build steps

- [x] Fix 1: rework the `block-field-focus` handler in
      `src/custom/block-field-sync/Component.tsx` to expand from the block row
      downward, iterating until the target field is reachable.
      **Done when:** on a hard-refreshed page where no accordion has ever been
      opened, clicking editable text in the preview expands that block's "Edit"
      accordion and scrolls to the field - including a nested `features.N.title`
      path - verified in a real browser.
- [x] Fix 2: make `attemptToLeave()` in
      `src/custom/information-tab-edit-autocollapse/Component.tsx` treat focus
      inside the live-preview iframe as still-active, reusing the shared
      iframe-id constant.
      **Done when:** with an accordion open, hovering it and then clicking an
      element in the preview leaves it open, with no COLLAPSED transition in
      the mutation log; auto-collapse still fires when leaving the accordion
      without entering the preview.

## Verify

- Hard refresh the Pages edit view with Live Preview open, having never
  expanded any accordion; click editable text in the preview. The matching
  "Edit" accordion expands and the field is scrolled to and highlighted.
- Repeat for a nested array field (`features.N.title`) in the FeatureGrid
  block.
- With an accordion already open, hover it, then click one of its elements in
  the preview: it stays open, with no visible close/reopen flicker.
- Click away from an open accordion *without* entering the preview: it still
  auto-collapses as before.
- Hover highlighting and the `block-select`/`block-deselect` sync into the
  iframe still behave as before.

## Verification record

Driven against the running dev server in real Chrome (Playwright), starting
from a genuinely never-expanded page (hard reload, with
`field-blocks__0__heading` confirmed absent from the DOM beforehand):

| Check | Result |
| --- | --- |
| Click preview text after a hard refresh | `blocks-row-0` "Edit" accordion expands |
| Nested `features.0.title` | `blocks-row-2` and `blocks-2-features-row-0` both open; `field-blocks__2__features__0__title` present with `ancestors=[open, open, open]`; sibling feature rows stay collapsed |
| Open accordion + click same block's text in preview | Stays open; no unattributed collapse in the mutation log |
| Leave the accordion without entering the preview | Still auto-collapses, unchanged |

Automated gates: `npm run lint` (0 errors, 4 pre-existing warnings),
`npm run build` (compiled successfully), `npm run test:int` (8 files, 60
tests passing, including the new `tests/int/blockRowLookup.int.spec.ts`).

The original diagnosis in the first version of this spec - an async
`getPreference()` race in Payload's `CollapsibleField` - was disproved by the
live repro: the `block-field-focus` message always arrived, and the field
element was absent because a collapsible renders no children until it has
been opened once, not because of timing.
