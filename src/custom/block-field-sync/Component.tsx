'use client'
import { useEffect, useRef } from 'react'
import { useForm } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { getServerSideURL } from '@/utilities/getUrl'
import { isBlockSyncEvent } from '@/utilities/blockSyncMessages'
import { findRowElementForBlockId, parseRowId } from '@/utilities/blockRowLookup'
import './styles.css'

// Every nesting level that can hide a field - our own "Edit" accordion
// (editAccordion.ts), an array field's own per-row collapse
// (`fields/Array/ArrayRow.js`), and Payload's native per-block-row collapse
// (`fields/Blocks/BlockRow.js`) - is built on this exact same `Collapsible`
// UI primitive (confirmed by reading all three sources), sharing the same
// `collapsible`/`collapsible--collapsed`/`collapsible__toggle` classes.
// That means a single generic "walk up through every collapsed ancestor"
// works for any depth (a plain block field, or something nested inside an
// array like FeatureGrid's `features`) without needing to special-case each
// level by name. There's no public API to open or close one of these from
// outside its own subtree (`useCollapsible()` only works for a component
// rendered inside it), so this clicks its real toggle button, exactly as a
// user would.
const COLLAPSIBLE_SELECTOR = '.collapsible'
const COLLAPSIBLE_TOGGLE_SELECTOR = '.collapsible__toggle'
const COLLAPSED_CLASS = 'collapsible--collapsed'
// AnimateHeight's own open transition (see Collapsible's source) - jumping
// to the field before it's finished would scroll to a still-animating,
// not-yet-final position. Nested collapsibles all animate in parallel when
// clicked together, so one wait covers however many levels just opened.
const EXPAND_ANIMATION_MS = 400
// How long to wait, after a field blurs, before actually collapsing what
// was auto-expanded for it - long enough that moving focus between two
// fields that share an ancestor (e.g. two `features` rows in the same
// FeatureGrid block) never reads as "done editing", short enough that
// collapsing after a genuine blur still feels immediate.
const BLUR_GRACE_MS = 150
const JUMP_HIGHLIGHT_CLASS = 'field-jump-highlight'

/** Payload's own field-id convention (`fields/Text/Input.js`, `fields/Textarea/Input.js` in `@payloadcms/ui`), not something this project defined. */
function fieldElementId(fullPath: string) {
  return `field-${fullPath.replace(/\./g, '__')}`
}

function isCollapsed(el: HTMLElement) {
  return el.classList.contains(COLLAPSED_CLASS)
}

function clickToggle(el: HTMLElement) {
  el.querySelector<HTMLButtonElement>(COLLAPSIBLE_TOGGLE_SELECTOR)?.click()
}

/** Every collapsible ancestor of `el`, innermost first. */
function findAncestorCollapsibles(el: Element): HTMLElement[] {
  const result: HTMLElement[] = []
  let current = el.closest<HTMLElement>(COLLAPSIBLE_SELECTOR)
  while (current) {
    result.push(current)
    current = current.parentElement?.closest<HTMLElement>(COLLAPSIBLE_SELECTOR) ?? null
  }
  return result
}

/**
 * Makes the currently-open ancestor collapsibles match what a target field
 * needs (`ancestors`, innermost first): collapses anything in `owned` no
 * longer among them (no longer relevant to what's now focused), and expands
 * whichever of `ancestors` is currently collapsed. Returns the new owned
 * set (elements this reconciliation had to expand, plus previously-owned
 * ones still relevant) and whether it actually expanded anything - the
 * caller only needs to wait out the open animation when it did. An
 * ancestor that was already open but never auto-expanded by this component
 * (the editor opened it themselves) is left alone either way.
 */
function reconcileExpanded(ancestors: HTMLElement[], owned: HTMLElement[]) {
  const stillNeeded = new Set(ancestors)
  for (const el of owned) {
    if (!stillNeeded.has(el)) clickToggle(el)
  }
  const nextOwned: HTMLElement[] = []
  let expandedSomething = false
  for (const el of ancestors) {
    if (isCollapsed(el)) {
      clickToggle(el)
      nextOwned.push(el)
      expandedSomething = true
    } else if (owned.includes(el)) {
      nextOwned.push(el)
    }
  }
  return { nextOwned, expandedSomething }
}

function scrollToAndHighlight(fullPath: string) {
  const target = document.getElementById(fieldElementId(fullPath))
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  // Restart the animation even if it's still running from a previous jump -
  // remove, force a reflow, re-add (the same trick InformationTabEditAutoCollapse
  // uses for its own nudge flash).
  target.classList.remove(JUMP_HIGHLIGHT_CLASS)
  void target.offsetWidth
  target.classList.add(JUMP_HIGHLIGHT_CLASS)
  const clear = () => target.classList.remove(JUMP_HIGHLIGHT_CLASS)
  target.addEventListener('animationend', clear, { once: true })
}

/**
 * Admin-side listener for the messages the Live Preview iframe posts about a
 * field an editor is interacting with (see current-feature.md):
 *
 * - `block-text-edit` - writes the edited value straight into this
 *   document's own form state, so the existing unsaved-changes/Save flow
 *   (the block's "Edit" accordion Save button) picks it up unchanged.
 * - `block-field-focus` - fired once when an editable element gains focus
 *   in the iframe (not per keystroke). Expands every collapsed ancestor
 *   collapsible the field needs (see `reconcileExpanded`), then scrolls the
 *   sidebar to the matching field. Never moves keyboard focus there - the
 *   iframe's contentEditable element already holds it, and `.focus()` on
 *   the sidebar field would steal it across frames, ending the very edit
 *   that triggered this.
 * - `block-field-blur` - the counterpart: after a short grace period,
 *   collapses whatever this component auto-expanded for that field, unless
 *   a newer focus has already superseded it.
 *
 * Mounted the same way `BlockHoverSync` is - a top-level `ui` field in the
 * Content tab, not nested inside any block - so it's listening regardless
 * of which block rows are collapsed.
 */
export const BlockFieldSync: UIFieldClientComponent = () => {
  const { getField, dispatchFields, setModified } = useForm()
  // What this component currently has auto-expanded, for the field it most
  // recently focused - never anything the editor expanded by hand. Plain
  // refs (no re-render needed): read/written only inside the message
  // handler below.
  const ownedRef = useRef<HTMLElement[]>([])
  const activeFieldKeyRef = useRef<string | null>(null)
  const pendingBlurTimeoutRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)

  useEffect(() => {
    const serverURL = getServerSideURL()

    const cancelPendingBlur = () => {
      if (pendingBlurTimeoutRef.current === null) return
      window.clearTimeout(pendingBlurTimeoutRef.current)
      pendingBlurTimeoutRef.current = null
    }

    const onMessage = (event: MessageEvent) => {
      if (!isBlockSyncEvent(event, serverURL)) return
      const validTypes = ['block-text-edit', 'block-field-focus', 'block-field-blur']
      if (!validTypes.includes(event.data.type)) return

      const { blockId, fieldPath } = event.data

      if (event.data.type === 'block-text-edit') {
        const rowEl = findRowElementForBlockId(blockId, getField)
        if (!rowEl) return
        const rowId = parseRowId(rowEl)
        if (!rowId) return
        dispatchFields({
          type: 'UPDATE',
          path: `${rowId.fieldName}.${rowId.rowIndex}.${fieldPath}`,
          value: event.data.value,
        })
        setModified(true)
        return
      }

      const fieldKey = `${blockId}:${fieldPath}`

      if (event.data.type === 'block-field-blur') {
        if (activeFieldKeyRef.current !== fieldKey) return
        cancelPendingBlur()
        pendingBlurTimeoutRef.current = window.setTimeout(() => {
          pendingBlurTimeoutRef.current = null
          // A newer focus (same field or a different one) already
          // reconciled ownership - this blur is stale, nothing to do.
          if (activeFieldKeyRef.current !== fieldKey) return
          for (const el of ownedRef.current) clickToggle(el)
          ownedRef.current = []
          activeFieldKeyRef.current = null
        }, BLUR_GRACE_MS)
        return
      }

      // block-field-focus
      cancelPendingBlur()
      activeFieldKeyRef.current = fieldKey

      const rowEl = findRowElementForBlockId(blockId, getField)
      if (!rowEl) return
      const rowId = parseRowId(rowEl)
      if (!rowId) return
      const fullPath = `${rowId.fieldName}.${rowId.rowIndex}.${fieldPath}`

      const target = document.getElementById(fieldElementId(fullPath))
      if (!target) return

      const ancestors = findAncestorCollapsibles(target)
      const { nextOwned, expandedSomething } = reconcileExpanded(ancestors, ownedRef.current)
      ownedRef.current = nextOwned

      if (expandedSomething) {
        window.setTimeout(() => scrollToAndHighlight(fullPath), EXPAND_ANIMATION_MS)
      } else {
        scrollToAndHighlight(fullPath)
      }
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      cancelPendingBlur()
    }
  }, [getField, dispatchFields, setModified])

  return null
}
