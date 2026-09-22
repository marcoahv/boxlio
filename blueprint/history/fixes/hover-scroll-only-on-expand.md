# Current Feature

**Title:** Hovering a block no longer scrolls the live preview iframe
**Type:** Fix
**Status:** verified
**Branch:** `fix/hover-scroll-only-on-expand`

## The problem

With a Page open in the admin and its Live Preview tab visible, simply
hovering a block's row in the sidebar scrolls the preview iframe to that
block. It should only highlight on hover; scrolling should happen only when
the block is actually selected (its "Edit" accordion expanded).

Confirmed in code, not just behavior:

- `src/custom/block-hover-sync/Component.tsx`'s `onMouseOver` posts a
  `block-hover` message on every row hover (`postToLivePreviewIframe({
  type: 'block-hover', blockId })`), regardless of whether that row's "Edit"
  accordion is open.
- `src/utilities/useBlockSyncListener.ts`'s `onMessage` switch calls
  `maybeScrollTo(message.blockId)` for **both** `'block-hover'` and
  `'block-select'`:

  ```ts
  case 'block-hover':
    hoveredBlockId = message.blockId
    syncHighlights()
    maybeScrollTo(message.blockId)   // <- scrolls on hover
    return
  ...
  case 'block-select':
    selectedBlockIds.add(message.blockId)
    syncHighlights()
    maybeScrollTo(message.blockId)   // <- scrolls on expand (correct)
    return
  ```

  This mirrors the original feature spec
  (`blueprint/history/features/28-editor-to-preview-block-sync.md`, step 3:
  "Scroll on hover, not on expand"), which intentionally coupled hover to
  scroll. The desired behavior has changed: hover should highlight only;
  expand (`block-select`) should be the only thing that scrolls.

## The fix

In `src/utilities/useBlockSyncListener.ts`, drop the `maybeScrollTo` call
from the `'block-hover'` case, keeping `hoveredBlockId` tracking and
`syncHighlights()` (hover still highlights the matching preview element).
Leave the `'block-select'` case's `maybeScrollTo` call as-is, so expanding a
block's "Edit" accordion is still what scrolls the preview to it.

Must not break:

- Hover highlight still applies/clears on `block-hover`/`block-hover-clear`.
- Selecting (expanding) a block still highlights **and** scrolls, with the
  existing `lastScrolledBlockId` dedup (no re-scroll if already scrolled to
  that block).
- Deselecting (`block-deselect`) still just clears highlight, no scroll
  involved either way.

## Build steps

- [x] 1. Remove the `maybeScrollTo(message.blockId)` call from the
      `'block-hover'` case in `src/utilities/useBlockSyncListener.ts`. Update
      the file's own doc comments/JSDoc that describe hover as
      triggering scroll, since they'll otherwise contradict the code.
      **Done when:** with a Page open in the admin and Live Preview visible,
      hovering a block's row (expanded or not) highlights it in the iframe
      without moving the iframe's scroll position; expanding that block's
      "Edit" accordion still scrolls the iframe to it.

## Verify

- Open a Page with several blocks in the admin, Live Preview tab visible.
- Hover each block's row in turn (without expanding any "Edit" accordion):
  the matching block highlights in the iframe; the iframe does not scroll.
- Expand a block's "Edit" accordion: the iframe scrolls to and highlights
  that block, same as before.
- Collapse it again: highlight clears, no scroll.
- Hover a different, off-screen block while another is still selected: the
  hovered block highlights too (both can be highlighted at once, per the
  original feature), but the iframe still doesn't scroll from the hover
  alone.

## Verification record

Automated gates run in the builder session:

- `npm run lint` - 0 errors, 4 pre-existing warnings (unrelated files)
- `npm run build` - compiled successfully
- `npm run test:int` - 11 files, 79 tests passing

No browser-automation tool was available in the builder session, so the
manual "Verify" steps above (hover vs. expand behavior in a real browser)
were not independently driven end-to-end; the dev server was confirmed
running and reachable (`curl http://localhost:3000` -> 200) but the visual
check is left to the user per the note above.
