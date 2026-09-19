'use client'

import { useEffect, useState } from 'react'
import { isLivePreviewEvent } from '@payloadcms/live-preview'
import { getServerSideURL } from './getUrl'

/**
 * A genuine `payload-live-preview` message carrying a real document, for
 * *any* collection or global - unlike `useIsLivePreviewActive`'s per-document
 * filtering. Content that renders outside a specific Page/Post's own React
 * tree (Header, Footer) can't ask "is Pages' live preview active" the way
 * `PageClient` can; this answers the broader "did Payload's real Live
 * Preview just say something," which is what a navigation guard needs
 * regardless of which document triggered it.
 *
 * "Carrying a real document" is required, not just `isLivePreviewEvent`
 * alone: `@payloadcms/live-preview`'s own `ready()` posts a bare
 * `{ type: 'payload-live-preview', ready: true }` handshake to
 * `window.opener || window.parent` - which, on an ordinary top-level page
 * with neither (any normal, non-embedded page view), is the window itself
 * (a top window's own `.parent` is itself), so that ping self-delivers on
 * every single page load. `useIsLivePreviewActive` never sees this as a
 * false positive because its per-target match implicitly requires a
 * `collectionSlug`/`globalSlug` the bare ping never carries; this checks for
 * either field instead of one specific one, rather than trusting
 * `isLivePreviewEvent` on its own - confirmed live: without this check,
 * `useIsInsideLivePreview` (and the nav guard built on it) fired on every
 * plain page visit, not just genuine Live Preview.
 */
export function isGenuineLivePreviewDocumentMessage(
  event: MessageEvent,
  serverURL: string,
): boolean {
  if (!isLivePreviewEvent(event, serverURL)) return false
  const data = event.data as { collectionSlug?: unknown; globalSlug?: unknown }
  return Boolean(data.collectionSlug || data.globalSlug)
}

/**
 * True once this window has received at least one message satisfying
 * `isGenuineLivePreviewDocumentMessage` - see that function for what makes a
 * message "genuine."
 *
 * Deliberately NOT derived from an iframe-embedding heuristic
 * (`window.self !== window.top`) alone, for the same reason
 * `useIsLivePreviewActive` avoids it: that can't tell "genuinely open in
 * Payload's Live Preview" apart from "embedded in any other iframe," and a
 * real visitor embedding the site elsewhere must never have their
 * navigation silently broken.
 */
export function useIsInsideLivePreview(): boolean {
  const [isActive, setIsActive] = useState(false)

  useEffect(() => {
    if (isActive) return

    const serverURL = getServerSideURL()
    const onMessage = (event: MessageEvent) => {
      if (!isGenuineLivePreviewDocumentMessage(event, serverURL)) return
      setIsActive(true)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isActive])

  return isActive
}
