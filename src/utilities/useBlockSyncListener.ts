'use client'

import { useEffect } from 'react'
import { getServerSideURL } from './getUrl'
import { isBlockSyncEvent } from './blockSyncMessages'

const HIGHLIGHT_CLASS = 'block-sync-highlight'

/**
 * `Element.scrollIntoView()` walks up through ancestor browsing contexts per
 * spec - when this page is rendered inside the admin's live-preview iframe,
 * that means it can also scroll the *parent admin window* to bring the
 * iframe element itself more fully into view, which is exactly what made
 * hovering a block snap the whole outer browser window to the bottom. This
 * scrolls only the current window (this frame's own scrolling element),
 * which never crosses into a parent frame.
 */
function scrollWithinThisWindow(target: Element) {
  const rect = target.getBoundingClientRect()
  const scrollMarginTop = parseFloat(getComputedStyle(target).scrollMarginTop) || 0
  const top = window.scrollY + rect.top - scrollMarginTop
  window.scrollTo({ top, behavior: 'smooth' })
}

/**
 * Frontend half of the editor-to-preview block sync: reacts to postMessage
 * signals from the admin panel's hover/select bridge
 * (`src/custom/block-hover-sync/Component.tsx`) by highlighting the matching
 * `[data-block-id]` element (see `src/blocks/index.tsx`), and scrolling to it
 * only once it's selected (a block's "Edit" accordion left open) - hover
 * alone highlights but never moves the iframe's scroll position. Hover is
 * transient (mouse over a row); selection persists independently, so a block
 * being actively edited stays highlighted after the mouse moves away.
 *
 * A no-op outside live preview - nothing ever posts these messages there -
 * and a silent no-op when a block id has no matching element on this page
 * (e.g. a Post's Lexical-embedded blocks, which don't render this marker;
 * editor-to-preview sync there is a separate future feature).
 */
export function useBlockSyncListener() {
  useEffect(() => {
    const serverURL = getServerSideURL()
    // Hover is a single, transient id; selection (an "Edit" accordion left
    // open) can apply to several blocks at once and persists independently
    // of hover - a block is highlighted if it's either. highlightedElements
    // is the currently-applied subset of that, so syncHighlights can diff
    // against it rather than blindly re-querying/re-classing every message.
    let hoveredBlockId: string | null = null
    const selectedBlockIds = new Set<string>()
    const highlightedElements = new Map<string, Element>()
    // Only 'block-select' ever scrolls (see maybeScrollTo's callers below).
    // Deliberately NOT reset by clearHighlight/block-deselect: collapsing and
    // re-expanding the same block's "Edit" accordion re-sends a select for a
    // block that was already the last one scrolled to, and this stops that
    // from re-scrolling right back - it remembers the last block actually
    // scrolled to until a genuinely different one is selected.
    let lastScrolledBlockId: string | null = null

    const findTarget = (blockId: string) =>
      document.querySelector(`[data-block-id="${CSS.escape(blockId)}"]`)

    const isActive = (blockId: string) => blockId === hoveredBlockId || selectedBlockIds.has(blockId)

    const syncHighlights = () => {
      for (const [blockId, el] of highlightedElements) {
        if (isActive(blockId)) continue
        el.classList.remove(HIGHLIGHT_CLASS)
        highlightedElements.delete(blockId)
      }
      const desired = new Set(selectedBlockIds)
      if (hoveredBlockId) desired.add(hoveredBlockId)
      for (const blockId of desired) {
        if (highlightedElements.has(blockId)) continue
        const el = findTarget(blockId)
        if (!el) continue
        el.classList.add(HIGHLIGHT_CLASS)
        highlightedElements.set(blockId, el)
      }
    }

    const maybeScrollTo = (blockId: string) => {
      if (blockId === lastScrolledBlockId) return
      const target = findTarget(blockId)
      if (!target) return
      lastScrolledBlockId = blockId
      scrollWithinThisWindow(target)
    }

    const onMessage = (event: MessageEvent) => {
      if (!isBlockSyncEvent(event, serverURL)) return
      const message = event.data

      switch (message.type) {
        case 'block-hover':
          // Highlight only - never scrolls. Scrolling is reserved for
          // selection (see 'block-select' below), so merely hovering a
          // block's row doesn't move the iframe's scroll position.
          hoveredBlockId = message.blockId
          syncHighlights()
          return
        case 'block-hover-clear':
          hoveredBlockId = null
          syncHighlights()
          return
        case 'block-select':
          selectedBlockIds.add(message.blockId)
          syncHighlights()
          maybeScrollTo(message.blockId)
          return
        case 'block-deselect':
          selectedBlockIds.delete(message.blockId)
          syncHighlights()
          return
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      for (const el of highlightedElements.values()) el.classList.remove(HIGHLIGHT_CLASS)
    }
  }, [])
}
