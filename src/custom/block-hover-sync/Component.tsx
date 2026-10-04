'use client'
import { useEffect } from 'react'
import { useForm } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { $isBlockNode } from '@payloadcms/richtext-lexical/client'
import { $getNearestNodeFromDOMNode, getNearestEditorFromDOMNode } from '@payloadcms/richtext-lexical/lexical'
import { postToLivePreviewIframe } from '@/utilities/postToLivePreviewIframe'
import {
  ROW_SELECTOR,
  resolveBlockId as resolveBlockIdFromRow,
  findTopLevelRowAncestor,
  parseRowId,
} from '@/utilities/blockRowLookup'
import { findEnclosingBlockId } from '@/utilities/lexicalBlockLookup'

/** Payload's own field-id convention (`fields/Text/Input.js`, `fields/Textarea/Input.js` in `@payloadcms/ui`) - the reverse of `block-field-sync/Component.tsx`'s own `fieldElementId`. */
function fullPathFromFieldElementId(id: string): string | undefined {
  if (!id.startsWith('field-')) return undefined
  return id.slice('field-'.length).replace(/__/g, '.')
}

// The nested "Edit" accordion's own toggled element (editAccordion.ts's
// `block-edit-collapsible` on the field wrapper, `.collapsible` on the raw
// primitive it wraps - see admin-timestamps/styles.css's own comments on
// this exact pair for why both classes are needed). `.collapsible--collapsed`
// toggling on it is exactly what "Edit" being open/closed looks like in the
// DOM, regardless of which block or how many fields it has.
const EDIT_TOGGLE_SELECTOR = '.block-edit-collapsible > .collapsible'

/**
 * One global bridge, mounted once at the top level of the Pages and Posts
 * fields (see src/collections/Pages/config.ts's Content / Layout tab and
 * src/collections/Posts/config.ts's Content / Layout tab) - not nested
 * inside any block - so it's interactive from page load regardless of which
 * block rows are collapsed. Hovering any part of a block's row (label,
 * pill, fields) highlights and scrolls to it in the live preview iframe;
 * leaving it clears the highlight. Independently, expanding a block's
 * "Edit" accordion selects it (persists the highlight regardless of hover)
 * until it's collapsed again. Focusing a specific plain text/textarea field
 * scrolls the iframe to that exact element rather than just the block (see
 * `onFocusIn` below).
 *
 * Two distinct resolution paths feed the same `block-hover`/
 * `block-hover-clear` messages: Pages' (and Posts' top-level) `blocks`/
 * `blogBlocks` field renders each row with a `[id*="-row-"]` DOM id
 * (`blockRowLookup.ts`'s `ROW_SELECTOR`), resolved directly from that id.
 * Blocks embedded inside Posts' `body` Lexical rich text (`BlocksFeature`)
 * render no such id - `BlocksNode.decorate()` carries nothing identifying
 * the block in the DOM - so `resolveLexicalBlockId` below instead asks
 * Lexical itself: `getNearestEditorFromDOMNode` finds the owning editor for
 * a hovered DOM node, then `$getNearestNodeFromDOMNode` plus
 * `findEnclosingBlockId`/`$isBlockNode` walk up the Lexical node tree to the
 * nearest enclosing block and its `fields.id`. Only `block-hover`/
 * `block-hover-clear` use this fallback; `block-select`/`block-deselect`
 * (Edit-accordion expand/collapse, via `notifySelection` below) and
 * `admin-field-focus` (via `onFocusIn` below) still require a
 * `ROW_SELECTOR` match and silently no-op for embedded blocks - out of
 * scope for now, same reasoning as the inline-text-edit boundary in
 * `src/components/RichText/converters/index.tsx`.
 */
export const BlockHoverSync: UIFieldClientComponent = () => {
  const { getField } = useForm()

  useEffect(() => {
    const resolveBlockId = (rowEl: Element) => resolveBlockIdFromRow(rowEl, getField)

    // Lexical-embedded blocks (Posts' `body`) have no `ROW_SELECTOR` match,
    // so there's no DOM id to resolve - ask the Lexical editor that owns
    // this DOM node for its nearest enclosing block instead. Returns
    // undefined (never throws) for any node outside a Lexical editor, or
    // one with no enclosing block (plain paragraph text, etc).
    const resolveLexicalBlockId = (target: EventTarget | null): string | undefined => {
      if (!(target instanceof Node)) return undefined
      const editor = getNearestEditorFromDOMNode(target)
      if (!editor) return undefined
      try {
        return editor
          .getEditorState()
          .read(() => findEnclosingBlockId($getNearestNodeFromDOMNode(target), $isBlockNode))
      } catch {
        return undefined
      }
    }

    let hoveredRowId: string | null = null
    let hoveredLexicalBlockId: string | null = null

    const onMouseOver = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return
      const rowEl = e.target.closest<HTMLElement>(ROW_SELECTOR)
      if (rowEl) {
        if (rowEl.id === hoveredRowId) return
        const blockId = resolveBlockId(rowEl)
        if (!blockId) return
        hoveredRowId = rowEl.id
        hoveredLexicalBlockId = null
        postToLivePreviewIframe({ type: 'block-hover', blockId })
        return
      }
      const blockId = resolveLexicalBlockId(e.target)
      if (!blockId || blockId === hoveredLexicalBlockId) return
      hoveredLexicalBlockId = blockId
      hoveredRowId = null
      postToLivePreviewIframe({ type: 'block-hover', blockId })
    }

    const onMouseOut = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return
      if (hoveredRowId) {
        const rowEl = e.target.closest<HTMLElement>(ROW_SELECTOR)
        if (!rowEl || rowEl.id !== hoveredRowId) return
        const related = e.relatedTarget
        if (related instanceof Node && rowEl.contains(related)) return
        hoveredRowId = null
        postToLivePreviewIframe({ type: 'block-hover-clear' })
        return
      }
      if (!hoveredLexicalBlockId) return
      if (resolveLexicalBlockId(e.target) !== hoveredLexicalBlockId) return
      if (resolveLexicalBlockId(e.relatedTarget) === hoveredLexicalBlockId) return
      hoveredLexicalBlockId = null
      postToLivePreviewIframe({ type: 'block-hover-clear' })
    }

    document.addEventListener('mouseover', onMouseOver)
    document.addEventListener('mouseout', onMouseOut)

    /**
     * Focusing a field directly in the sidebar (not just hovering/selecting
     * its block) scrolls the iframe to that exact element, not merely the
     * block containing it - the reverse-direction counterpart to
     * `block-field-focus` (`block-field-sync/Component.tsx`), which already
     * does this for iframe -> admin. `[id^="field-"]` only exists on plain
     * text/textarea-style fields (Payload's own richText field wrapper never
     * renders it - see that file's own `findFieldElement` comment), so this
     * silently no-ops for rich text fields for now; the existing block-level
     * scroll from `notifySelection` below still applies to those. Resolving
     * through `findTopLevelRowAncestor` rather than a plain
     * `closest(ROW_SELECTOR)` is required for a field nested inside an
     * array (a Hero button's `label`, a FeatureGrid item's `title`) - the
     * nearest row there is that array's own, not the block's.
     */
    const onFocusIn = (e: FocusEvent) => {
      if (!(e.target instanceof Element)) return
      const fieldEl = e.target.closest<HTMLElement>('[id^="field-"]')
      if (!fieldEl) return
      const fullPath = fullPathFromFieldElementId(fieldEl.id)
      if (!fullPath) return
      const rowEl = findTopLevelRowAncestor(fieldEl)
      if (!rowEl) return
      const rowId = parseRowId(rowEl)
      const blockId = resolveBlockId(rowEl)
      if (!rowId || !blockId) return
      const rowPrefix = `${rowId.fieldName}.${rowId.rowIndex}.`
      if (!fullPath.startsWith(rowPrefix)) return
      const fieldPath = fullPath.slice(rowPrefix.length)
      postToLivePreviewIframe({ type: 'admin-field-focus', blockId, fieldPath })
    }

    document.addEventListener('focusin', onFocusIn)

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
      document.removeEventListener('focusin', onFocusIn)
      observer.disconnect()
    }
  }, [getField])

  return null
}
