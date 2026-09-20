'use client'
import { useEffect, useRef } from 'react'
import {
  useCollapsible,
  useFormInitializing,
  useFormModified,
  useFormProcessing,
} from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import { LIVE_PREVIEW_IFRAME_ID } from '@/utilities/postToLivePreviewIframe'
import { isProgrammaticBlockClick } from '@/utilities/programmaticBlockClick'
import { ROW_SELECTOR } from '@/utilities/blockRowLookup'

const WRAPPER_SELECTOR = '.info-tab-edit-collapsible'
const NUDGE_TARGET_SELECTOR = '.information-tab-save'
const NUDGE_CLASS = 'information-tab-save--nudge'
const TAB_BUTTON_SELECTOR = '.tabs-field__tab-button'
const TAB_BUTTON_ACTIVE_CLASS = 'tabs-field__tab-button--active'
// Every accordion (this one, and any unrelated nested one - an array row
// inside the block's own fields, for instance) shares this exact class from
// the one underlying Collapsible primitive. Resolving "this accordion's own
// header" via querySelector's first-document-order match (done once below)
// rather than e.target.closest() is what keeps this scoped to the right one
// - closest() would instead find whichever toggle-wrap is nearest to the
// click, which is wrong once the block's own fields contain something else
// collapsible.
const TOGGLE_WRAP_SELECTOR = '.collapsible__toggle-wrap'

/**
 * Editing a block's text directly in the Live Preview iframe is still editing
 * *this* accordion's fields, but it doesn't look like it from out here: focus
 * inside a child frame surfaces in this document as the `<iframe>` element
 * itself, which of course isn't inside the accordion, and reaching the
 * preview means the mouse leaves the sidebar. Both would otherwise read as
 * "the editor is done here" and collapse the accordion out from under them -
 * see BlockFieldSync for the other half of this preview/sidebar pairing.
 */
const isLivePreviewFocused = () => document.activeElement?.id === LIVE_PREVIEW_IFRAME_ID

type Props = Parameters<UIFieldClientComponent>[0] & {
  /**
   * Skip forcing the accordion closed on mount when the form had already
   * finished initializing at that moment - i.e. this instance mounted after
   * the document's initial load, meaning it's a freshly added block rather
   * than one already saved on the document. Used by block accordions so
   * adding a block doesn't auto-hide it moments later; Pages/Posts never set
   * this, so their existing "always force-collapse on mount" behavior is
   * unchanged.
   */
  skipForcedCollapseIfFresh?: boolean
}

export const InformationTabEditAutoCollapse: UIFieldClientComponent = ({
  skipForcedCollapseIfFresh = false,
}: Props) => {
  const { isCollapsed, toggle } = useCollapsible()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const formInitializing = useFormInitializing()
  const markerRef = useRef<HTMLSpanElement>(null)
  const stateRef = useRef({ isCollapsed, toggle, modified, processing })
  const wasModifiedRef = useRef(modified)
  const hasForcedInitialCollapseRef = useRef(false)

  stateRef.current = { isCollapsed, toggle, modified, processing }

  // Shared across effects (the tab-switch/native-toggle guard below and the
  // block-row-header effect) rather than defined inside one of them - both
  // need to nudge the same Save button the same way. Only ever reference
  // markerRef.current at call time, not at definition time, so recreating
  // these every render is safe even for an effect that captured an earlier
  // render's copy.
  const getNudgeTarget = () =>
    markerRef.current
      ?.closest<HTMLElement>(WRAPPER_SELECTOR)
      ?.querySelector<HTMLElement>(NUDGE_TARGET_SELECTOR) ?? null

  const clearNudge = () => getNudgeTarget()?.classList.remove(NUDGE_CLASS)

  const nudge = () => {
    const target = getNudgeTarget()
    if (!target) return
    target.classList.remove(NUDGE_CLASS)
    void target.offsetWidth // force a reflow so the animation restarts
    target.classList.add(NUDGE_CLASS)
  }

  useEffect(() => {
    if (hasForcedInitialCollapseRef.current) return
    hasForcedInitialCollapseRef.current = true
    if (isCollapsed === false) {
      if (skipForcedCollapseIfFresh && !formInitializing) return
      // Deferred rather than calling toggle() immediately: this fires
      // through the exact same animated open/close path a real click
      // does. Doing that synchronously at mount - right as Payload's own
      // AnimateHeight/ResizeObserver bookkeeping for the collapsible's
      // initial (expanded) render is still settling - left that machinery
      // in a bad state for the *next* toggle, causing the real bug this
      // fixes: opening "Edit" by hand right after load would visibly start
      // opening, then snap back closed, needing a second click. Waiting
      // past AnimateHeight's own 300ms animation duration lets it fully
      // settle first.
      const timeoutId = setTimeout(() => toggle(), 400)
      return () => clearTimeout(timeoutId)
    }
    // Only ever run once, right after mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const wasModified = wasModifiedRef.current
    wasModifiedRef.current = modified
    // A successful save flips `modified` back to false - clear the nudge
    // (it was only ever saying "you have unsaved work here"), but leave
    // "Edit" open exactly as the editor left it, rather than auto-closing it
    // out from under them.
    if (wasModified && !modified) clearNudge()
    // clearNudge is recreated every render but only ever reads markerRef.current
    // at call time, so an earlier render's copy behaves identically - see its
    // own definition above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [modified])

  useEffect(() => {
    const wrapper = markerRef.current?.closest<HTMLElement>(WRAPPER_SELECTOR)
    if (!wrapper) return

    wrapper.addEventListener('animationend', clearNudge)

    // This accordion's own toggle-wrap, resolved once here rather than via
    // e.target.closest() per click - see TOGGLE_WRAP_SELECTOR's own comment
    // for why closest() would be wrong once the block's own fields (once
    // "Edit" is open) contain some other collapsible, e.g. an array field's
    // own rows. querySelector returns the first document-order match, which
    // is this accordion's own header (rendered before its content).
    const ownToggleWrap = wrapper.querySelector<HTMLElement>(TOGGLE_WRAP_SELECTOR)

    // A mouseleave/focusout means the mouse or focus in particular is
    // leaving - not that both have. Unsaved changes nudge immediately on
    // either signal (e.g. the mouse leaves while the field is still
    // focused mid-typing); only the actual auto-collapse waits for both
    // hover and focus to have genuinely cleared.
    const attemptToLeave = () => {
      const { isCollapsed: collapsed, modified: hasChanges, processing: saving, toggle: flip } =
        stateRef.current
      if (collapsed) return
      // The Save button becomes disabled while a save is in flight (see
      // @payloadcms/ui's FormSubmit), and a disabled control is force-
      // blurred by the browser - that blur used to read as "leaving with
      // unsaved changes" and nudge on the very click that saves them. The
      // save resolving flips `modified` to false a moment later, which
      // already triggers the correct auto-collapse on its own - nothing to
      // do here while it's still in progress.
      if (saving) return
      if (hasChanges) {
        nudge()
        return
      }
      if (wrapper.matches(':hover') || wrapper.contains(document.activeElement)) return
      if (isLivePreviewFocused()) return
      clearNudge()
      flip()
    }

    const onMouseLeave = () => attemptToLeave()
    // Deferred rather than checked synchronously off the event: relatedTarget
    // timing/support is inconsistent across browsers, and checking it
    // synchronously caused a real bug - clicking the "Edit" header to open
    // it (moving focus onto the header button, which is itself inside
    // wrapper) could read as focus having already left, immediately
    // collapsing it right back before it finished opening. Waiting a tick
    // lets document.activeElement settle to its real final value first.
    let focusOutTimeoutId: ReturnType<typeof setTimeout> | undefined
    const onFocusOut = () => {
      focusOutTimeoutId = setTimeout(() => {
        if (wrapper.contains(document.activeElement)) return
        attemptToLeave()
      }, 0)
    }

    wrapper.addEventListener('mouseleave', onMouseLeave)
    wrapper.addEventListener('focusout', onFocusOut)

    // Block switching to another top-level tab while there's something
    // unsaved, instead of silently letting an editor navigate away from
    // it. Payload's tab buttons are plain React onClick handlers with no
    // href - a capture-phase listener here runs before the event ever
    // reaches the button, so stopping it here stops React from seeing it.
    const onDocumentClickCapture = (e: MouseEvent) => {
      if (!(e.target instanceof Element)) return

      // BlockFieldSync opens/closes accordions and switches this same
      // block's tabs by clicking their real buttons too (there's no other
      // API for it - see its own comment on that). Those clicks are
      // indistinguishable from a real one by any listener here, but they
      // aren't a user "Done" click risking lost track of unsaved work: the
      // field's value stays in form state regardless of whether its
      // accordion or tab is visible, so the guard below doesn't apply to
      // them at all.
      if (isProgrammaticBlockClick()) return

      // Block closing this accordion (a "Done" click) while there's
      // something unsaved - nudge Save instead of letting the click through
      // to Payload's own native toggle button. Only when *this* accordion is
      // open and about to close; opening is always fine.
      if (
        !stateRef.current.isCollapsed &&
        stateRef.current.modified &&
        ownToggleWrap?.contains(e.target)
      ) {
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        nudge()
        return
      }

      const tabButton = e.target.closest<HTMLElement>(TAB_BUTTON_SELECTOR)
      if (!tabButton || tabButton.classList.contains(TAB_BUTTON_ACTIVE_CLASS)) return

      // A tab button inside ANY block's own row (e.g. Hero's Content/
      // Layout) only concerns whichever block actually owns it - checked
      // against ROW_SELECTOR (not just `wrapper.contains`) so every other
      // already-mounted block's own listener for this exact click reaches
      // the same "not mine" conclusion and no-ops, regardless of which one
      // happens to run first.
      if (tabButton.closest(ROW_SELECTOR)) {
        if (!wrapper.contains(tabButton)) return
        if (!stateRef.current.modified) return
        e.preventDefault()
        e.stopPropagation()
        e.stopImmediatePropagation()
        nudge()
        return
      }

      if (!stateRef.current.modified) {
        // Nothing unsaved - let the tab switch happen normally, but make
        // sure "Edit" doesn't stay open behind it. Switching tabs unmounts
        // this whole component (Payload only renders the active tab's
        // fields), so it never gets a mouseleave/focusout if the mouse
        // happened to jump straight from wherever it was to the tab bar
        // without ever crossing back out through the accordion's own
        // bounds - that left "Edit" open, with no chance left to close it,
        // for anyone returning to this tab later.
        if (stateRef.current.isCollapsed === false) {
          clearNudge()
          stateRef.current.toggle()
        }
        return
      }

      e.preventDefault()
      e.stopPropagation()
      e.stopImmediatePropagation()
      if (stateRef.current.isCollapsed) {
        stateRef.current.toggle()
      }
      nudge()
    }

    document.addEventListener('click', onDocumentClickCapture, true)

    return () => {
      wrapper.removeEventListener('mouseleave', onMouseLeave)
      wrapper.removeEventListener('focusout', onFocusOut)
      wrapper.removeEventListener('animationend', clearNudge)
      document.removeEventListener('click', onDocumentClickCapture, true)
      if (focusOutTimeoutId !== undefined) clearTimeout(focusOutTimeoutId)
      clearNudge()
    }
    // clearNudge/nudge are recreated every render but only ever read
    // markerRef.current at call time - see their shared definition above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <span ref={markerRef} style={{ display: 'none' }} />
}
