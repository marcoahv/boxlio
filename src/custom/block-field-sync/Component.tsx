'use client'
import { useEffect, useRef, type MutableRefObject } from 'react'
import { useForm } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { getServerSideURL } from '@/utilities/getUrl'
import { isBlockSyncEvent } from '@/utilities/blockSyncMessages'
import {
  findRowElementForBlockId,
  parseRowId,
  rowElementIdsAlongPath,
} from '@/utilities/blockRowLookup'
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
// A block row's own "Edit" accordion (editAccordion.ts). Its header renders
// even while collapsed, so this is reachable from the row before any of the
// block's fields exist - the entry point for expanding into a block that has
// never been opened.
const EDIT_ACCORDION_SELECTOR = '.block-edit-collapsible > .collapsible'
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
// A collapsible renders no children at all until it has been expanded once,
// so a field inside a never-opened accordion has no DOM element to look up -
// which is why expanding has to start from the row wrappers (always present)
// and work inward, re-checking after each level opens. Each level needs both
// a React commit and its open animation before the next one exists, so the
// walk re-checks on this interval until the field is reachable, giving up
// after a budget that comfortably covers a few nested levels.
const EXPAND_STEP_MS = 60
const EXPAND_TIMEOUT_MS = 3000
const FOCUS_HIGHLIGHT_CLASS = 'field-focus-highlight'

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
 * The collapsibles currently standing between the document and `fullPath`'s
 * field, outermost first - as much of that chain as exists right now.
 *
 * Once the field is rendered its own ancestor chain is authoritative. Before
 * that it can't be: a collapsible mounts no children until it has been opened
 * once, so on a freshly loaded page the field (and every level under the
 * first closed one) is simply absent. This walks the row wrappers instead,
 * which are always present, and collects each one's own collapse plus - for a
 * block row - its "Edit" accordion. Opening those mounts the next level down,
 * so calling this again returns a longer chain; `expandTowardField` repeats
 * until it reaches the field.
 */
function collapsiblesTowardField(fullPath: string): HTMLElement[] {
  const target = document.getElementById(fieldElementId(fullPath))
  if (target) return findAncestorCollapsibles(target).reverse()

  const chain: HTMLElement[] = []
  const add = (el: HTMLElement | null) => {
    if (el && !chain.includes(el)) chain.push(el)
  }
  for (const rowId of rowElementIdsAlongPath(fullPath)) {
    const rowEl = document.getElementById(rowId)
    // Deeper rows only exist once the levels above them are open, so the
    // first missing one ends the chain this pass can reach.
    if (!rowEl) break
    for (const ancestor of findAncestorCollapsibles(rowEl).reverse()) add(ancestor)
    add(rowEl.querySelector<HTMLElement>(`:scope > ${COLLAPSIBLE_SELECTOR}`))
    add(rowEl.querySelector<HTMLElement>(EDIT_ACCORDION_SELECTOR))
  }
  return chain
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

/** Removes the highlight this component currently owns, if any. */
function clearFocusHighlight(highlightedRef: MutableRefObject<HTMLElement | null>) {
  highlightedRef.current?.classList.remove(FOCUS_HIGHLIGHT_CLASS)
  highlightedRef.current = null
}

/**
 * Scrolls the field into view and highlights it, clearing whichever field
 * this component previously highlighted first (a no-op when it's the same
 * element). The highlight otherwise persists until a caller explicitly
 * clears it - see `clearFocusHighlight` - so it stays lit for as long as the
 * field remains the one focused in the Live Preview iframe.
 */
function scrollToAndHighlight(
  fullPath: string,
  highlightedRef: MutableRefObject<HTMLElement | null>,
) {
  const target = document.getElementById(fieldElementId(fullPath))
  if (!target) return
  target.scrollIntoView({ behavior: 'smooth', block: 'center' })
  if (highlightedRef.current && highlightedRef.current !== target) {
    highlightedRef.current.classList.remove(FOCUS_HIGHLIGHT_CLASS)
  }
  target.classList.add(FOCUS_HIGHLIGHT_CLASS)
  highlightedRef.current = target
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
 *   that triggered this. Expanding works inward from the block's row rather
 *   than outward from the field, because a field inside an accordion that has
 *   never been opened isn't in the DOM at all - see
 *   `collapsiblesTowardField`.
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
  const pendingFocusRetryRef = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const highlightedRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    const serverURL = getServerSideURL()

    const cancelPendingBlur = () => {
      if (pendingBlurTimeoutRef.current === null) return
      window.clearTimeout(pendingBlurTimeoutRef.current)
      pendingBlurTimeoutRef.current = null
    }

    const cancelPendingFocusRetry = () => {
      if (pendingFocusRetryRef.current === null) return
      window.clearTimeout(pendingFocusRetryRef.current)
      pendingFocusRetryRef.current = null
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
        // The field being blurred no longer needs expanding, even if the
        // row/target lookup for it was still retrying (a very fast blur
        // right after a refresh, before the DOM settled).
        cancelPendingFocusRetry()
        cancelPendingBlur()
        pendingBlurTimeoutRef.current = window.setTimeout(() => {
          pendingBlurTimeoutRef.current = null
          // A newer focus (same field or a different one) already
          // reconciled ownership - this blur is stale, nothing to do.
          if (activeFieldKeyRef.current !== fieldKey) return
          for (const el of ownedRef.current) clickToggle(el)
          ownedRef.current = []
          activeFieldKeyRef.current = null
          clearFocusHighlight(highlightedRef)
        }, BLUR_GRACE_MS)
        return
      }

      // block-field-focus
      cancelPendingBlur()
      cancelPendingFocusRetry()
      activeFieldKeyRef.current = fieldKey

      const rowEl = findRowElementForBlockId(blockId, getField)
      if (!rowEl) return
      const rowId = parseRowId(rowEl)
      if (!rowId) return
      const fullPath = `${rowId.fieldName}.${rowId.rowIndex}.${fieldPath}`

      /**
       * Opens whatever of the chain is currently reachable, then re-checks:
       * a collapsible mounts its children only once it opens, so each pass
       * can reveal a deeper level that didn't exist to be found before. Ends
       * when the field itself is present with nothing left collapsed above it
       * - which on an already-open field is the very first pass, with no
       * delay before scrolling.
       */
      const expandTowardField = (deadline: number, expandedAny: boolean) => {
        if (activeFieldKeyRef.current !== fieldKey) return

        const chain = collapsiblesTowardField(fullPath)
        const { nextOwned, expandedSomething } = reconcileExpanded(chain, ownedRef.current)
        ownedRef.current = nextOwned
        const didExpand = expandedAny || expandedSomething

        const reached =
          !expandedSomething && document.getElementById(fieldElementId(fullPath)) !== null
        if (!reached && Date.now() < deadline) {
          pendingFocusRetryRef.current = window.setTimeout(() => {
            pendingFocusRetryRef.current = null
            expandTowardField(deadline, didExpand)
          }, EXPAND_STEP_MS)
          return
        }

        // Wait out the open animation only when this actually opened
        // something, so an already-visible field is scrolled to immediately.
        if (didExpand) {
          pendingFocusRetryRef.current = window.setTimeout(() => {
            pendingFocusRetryRef.current = null
            if (activeFieldKeyRef.current !== fieldKey) return
            scrollToAndHighlight(fullPath, highlightedRef)
          }, EXPAND_ANIMATION_MS)
        } else {
          scrollToAndHighlight(fullPath, highlightedRef)
        }
      }

      expandTowardField(Date.now() + EXPAND_TIMEOUT_MS, false)
    }

    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      cancelPendingBlur()
      cancelPendingFocusRetry()
      clearFocusHighlight(highlightedRef)
    }
  }, [getField, dispatchFields, setModified])

  return null
}
