'use client'
import { useEffect, useRef } from 'react'
import { useCollapsible, useFormModified, useFormProcessing } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'

const WRAPPER_SELECTOR = '.info-tab-edit-collapsible'
const NUDGE_TARGET_SELECTOR = '.information-tab-save'
const NUDGE_CLASS = 'information-tab-save--nudge'
const TAB_BUTTON_SELECTOR = '.tabs-field__tab-button'
const TAB_BUTTON_ACTIVE_CLASS = 'tabs-field__tab-button--active'

export const InformationTabEditAutoCollapse: UIFieldClientComponent = () => {
  const { isCollapsed, toggle } = useCollapsible()
  const modified = useFormModified()
  const processing = useFormProcessing()
  const markerRef = useRef<HTMLSpanElement>(null)
  const stateRef = useRef({ isCollapsed, toggle, modified, processing })
  const wasModifiedRef = useRef(modified)
  const hasForcedInitialCollapseRef = useRef(false)

  stateRef.current = { isCollapsed, toggle, modified, processing }

  useEffect(() => {
    if (hasForcedInitialCollapseRef.current) return
    hasForcedInitialCollapseRef.current = true
    if (isCollapsed === false) {
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
    if (wasModified && !modified && stateRef.current.isCollapsed === false) {
      // Clear any nudge directly rather than relying solely on its
      // animationend listener: collapsing makes the button display:none
      // once the collapse animation finishes, which cancels a still-
      // running CSS animation outright - a canceled animation never fires
      // animationend, so the class (and the flash) would otherwise be
      // stuck, ready to silently replay next time the button becomes
      // visible again.
      markerRef.current
        ?.closest<HTMLElement>(WRAPPER_SELECTOR)
        ?.querySelector<HTMLElement>(NUDGE_TARGET_SELECTOR)
        ?.classList.remove(NUDGE_CLASS)
      stateRef.current.toggle()
    }
  }, [modified])

  useEffect(() => {
    const wrapper = markerRef.current?.closest<HTMLElement>(WRAPPER_SELECTOR)
    if (!wrapper) return

    const getNudgeTarget = () => wrapper.querySelector<HTMLElement>(NUDGE_TARGET_SELECTOR)

    const clearNudge = () => getNudgeTarget()?.classList.remove(NUDGE_CLASS)
    wrapper.addEventListener('animationend', clearNudge)

    const nudge = () => {
      const target = getNudgeTarget()
      if (!target) return
      target.classList.remove(NUDGE_CLASS)
      void target.offsetWidth // force a reflow so the animation restarts
      target.classList.add(NUDGE_CLASS)
    }

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
      const tabButton = e.target.closest<HTMLElement>(TAB_BUTTON_SELECTOR)
      if (!tabButton || tabButton.classList.contains(TAB_BUTTON_ACTIVE_CLASS)) return

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
  }, [])

  return <span ref={markerRef} style={{ display: 'none' }} />
}
