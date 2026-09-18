'use client'
import { useEffect } from 'react'
import { useForm } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { postToLivePreviewIframe } from '@/utilities/postToLivePreviewIframe'
import { ROW_SELECTOR, resolveBlockId as resolveBlockIdFromRow } from '@/utilities/blockRowLookup'

// The nested "Edit" accordion's own toggled element (editAccordion.ts's
// `block-edit-collapsible` on the field wrapper, `.collapsible` on the raw
// primitive it wraps - see admin-timestamps/styles.css's own comments on
// this exact pair for why both classes are needed). `.collapsible--collapsed`
// toggling on it is exactly what "Edit" being open/closed looks like in the
// DOM, regardless of which block or how many fields it has.
const EDIT_TOGGLE_SELECTOR = '.block-edit-collapsible > .collapsible'

/**
 * One global bridge, mounted once at the top level of the Pages fields (see
 * src/collections/Pages/config.ts's Content tab) - not nested inside any
 * block - so it's interactive from page load regardless of which block rows
 * are collapsed. Hovering any part of a block's row (label, pill, fields)
 * highlights and scrolls to it in the live preview iframe; leaving it clears
 * the highlight. Independently, expanding a block's "Edit" accordion selects
 * it (persists the highlight regardless of hover) until it's collapsed again.
 * Posts' blocks embed in Lexical rich text rather than this field type, so
 * they never render a matching row id - out of scope, see
 * current-feature.md.
 */
export const BlockHoverSync: UIFieldClientComponent = () => {
  const { getField } = useForm()

  useEffect(() => {
    const resolveBlockId = (rowEl: Element) => resolveBlockIdFromRow(rowEl, getField)

    let hoveredRowId: string | null = null

    const onMouseOver = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return
      const rowEl = e.target.closest<HTMLElement>(ROW_SELECTOR)
      if (!rowEl || rowEl.id === hoveredRowId) return
      const blockId = resolveBlockId(rowEl)
      if (!blockId) return
      hoveredRowId = rowEl.id
      postToLivePreviewIframe({ type: 'block-hover', blockId })
    }

    const onMouseOut = (e: MouseEvent) => {
      if (!(e.target instanceof Element) || !hoveredRowId) return
      const rowEl = e.target.closest<HTMLElement>(ROW_SELECTOR)
      if (!rowEl || rowEl.id !== hoveredRowId) return
      const related = e.relatedTarget
      if (related instanceof Node && rowEl.contains(related)) return
      hoveredRowId = null
      postToLivePreviewIframe({ type: 'block-hover-clear' })
    }

    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)

    const notifySelection = (toggleEl: Element) => {
      const rowEl = toggleEl.closest<HTMLElement>(ROW_SELECTOR)
      if (!rowEl) return
      const blockId = resolveBlockId(rowEl)
      if (!blockId) return
      const isExpanded = !toggleEl.classList.contains('collapsible--collapsed')
      postToLivePreviewIframe({ type: isExpanded ? 'block-select' : 'block-deselect', blockId })
    }

    // A MutationObserver only reports changes from here on - anything
    // already expanded (e.g. a persisted "not collapsed" admin preference)
    // needs this one-time scan to be selected on load too.
    document.querySelectorAll(EDIT_TOGGLE_SELECTOR).forEach((el) => {
      if (!el.classList.contains('collapsible--collapsed')) notifySelection(el)
    })

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        const el = mutation.target
        if (!(el instanceof Element) || !el.matches(EDIT_TOGGLE_SELECTOR)) continue
        notifySelection(el)
      }
    })
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true })

    return () => {
      document.removeEventListener('mouseover', onMouseOver)
      document.removeEventListener('mouseout', onMouseOut)
      observer.disconnect()
    }
  }, [getField])

  return null
}
