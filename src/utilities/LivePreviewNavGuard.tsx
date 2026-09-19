'use client'

import { useEffect } from 'react'
import { useIsInsideLivePreview } from './useIsInsideLivePreview'
import { shouldInterceptLivePreviewNavClick } from './shouldInterceptLivePreviewNavClick'

/**
 * Renders nothing - its only job is stopping an internal link click from
 * navigating the Live Preview iframe away from the document being edited.
 * Mounted once in the root layout (the same pattern as
 * `SettingsLivePreviewSync`) so it covers every route, not just Header/
 * Footer nav: Header renders outside any Page/Post client component's own
 * tree, and the same problem applies identically to a link inside a block's
 * own content (a Hero/CallToAction button, a rich-text link).
 *
 * Why this exists at all: Payload's Live Preview data channel is only
 * (re-)established when the iframe's own `load` event fires - a real
 * navigation. `next/link`'s client-side routing swaps the page without that
 * event ever firing again, so the destination page's `useIsLivePreviewActive`
 * mounts fresh and waits forever - confirmed live: zero
 * `payload-live-preview` messages arrive after such a navigation, even
 * though `useScopedLivePreview` re-sends its own `ready()` handshake on
 * mount. Losing that channel silently drops `EditableFieldContext`'s
 * `isEditable` flag to `false`, which is what actually breaks inline
 * editing - preventing the navigation itself is the fix, not anything in
 * the editing code.
 */
export function LivePreviewNavGuard() {
  const isInsideLivePreview = useIsInsideLivePreview()

  useEffect(() => {
    if (!isInsideLivePreview) return

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return
      if (!(event.target instanceof Element)) return

      const anchor = event.target.closest('a[href]')
      if (!anchor) return

      const intercept = shouldInterceptLivePreviewNavClick({
        href: anchor.href,
        target: anchor.target || null,
        currentHref: window.location.href,
        button: event.button,
        metaKey: event.metaKey,
        ctrlKey: event.ctrlKey,
        shiftKey: event.shiftKey,
        altKey: event.altKey,
      })
      if (!intercept) return

      // next/link's own click handler bails out when `event.defaultPrevented`
      // is already true, so this alone is enough to stop the navigation -
      // no need to also stopPropagation() or fight React's event handling.
      event.preventDefault()
    }

    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [isInsideLivePreview])

  return null
}
