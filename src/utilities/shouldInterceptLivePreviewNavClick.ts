/**
 * Pure decision at the heart of `LivePreviewNavGuard`: given a resolved
 * link click, should it be stopped from navigating the Live Preview iframe
 * away from the document being edited? Kept separate from the DOM-handling
 * component so the decision itself is unit-testable without a browser.
 *
 * `href` and `currentHref` are both expected already-resolved absolute URLs
 * - exactly what a live `<a>` element's `.href` property and
 * `window.location.href` give at call time, not raw `getAttribute('href')`.
 */
export function shouldInterceptLivePreviewNavClick({
  href,
  target,
  currentHref,
  button,
  metaKey,
  ctrlKey,
  shiftKey,
  altKey,
}: {
  href: string
  target: string | null
  currentHref: string
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
}): boolean {
  // Only a plain left-click without modifiers is a same-tab navigation -
  // anything else (Cmd/Ctrl-click to open a new tab, a middle click) must
  // behave exactly as it would for a real visitor.
  if (button !== 0 || metaKey || ctrlKey || shiftKey || altKey) return false
  if (target === '_blank') return false

  let destination: URL
  let current: URL
  try {
    destination = new URL(href)
    current = new URL(currentHref)
  } catch {
    return false
  }
  if (destination.origin !== current.origin) return false
  // A same-page hash link (e.g. an in-page anchor) isn't a navigation away
  // from the document being edited - leave it alone.
  if (destination.pathname === current.pathname && destination.hash) return false

  return true
}
