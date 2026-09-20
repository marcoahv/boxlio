// BlockFieldSync has no public API to open/close a Collapsible or switch a
// TabsField from outside its own subtree, so it clicks the real toggle/tab
// button, exactly as a user would (see BlockFieldSync's own comment on
// COLLAPSIBLE_TOGGLE_SELECTOR). That click is indistinguishable, to any other
// document-level click listener, from a genuine user click - including
// InformationTabEditAutoCollapse's "don't silently close/switch while there's
// unsaved work" guard, which is meant to protect a real user action, not
// BlockFieldSync's own housekeeping as focus moves around the Live Preview
// iframe. This flag lets that guard tell the two apart.
let inProgress = false

/** True while a `.click()` dispatched via `withProgrammaticClick` is still running its listeners. */
export function isProgrammaticBlockClick() {
  return inProgress
}

/**
 * Runs `dispatchClick` (expected to call `.click()` on some element) with
 * the flag set for its duration. `.click()` dispatches and runs every
 * capture/bubble listener synchronously, so the flag is reliably back to
 * `false` by the time this returns - no async gap for an unrelated real
 * click to be misread as programmatic.
 */
export function withProgrammaticClick(dispatchClick: () => void) {
  inProgress = true
  try {
    dispatchClick()
  } finally {
    inProgress = false
  }
}
