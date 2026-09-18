'use client'

import { useEffect, useState } from 'react'
import { isLivePreviewEvent } from '@payloadcms/live-preview'
import { getServerSideURL } from './getUrl'

type LivePreviewTarget =
  | { type: 'collection'; collectionSlug: string }
  | { type: 'global'; globalSlug: string }

/**
 * True once this page has received at least one genuine
 * `payload-live-preview` message for the given document - the same signal
 * `useScopedLivePreview` already reacts to. Deliberately NOT derived from an
 * iframe-embedding heuristic (`window.self !== window.top`) alone: that
 * can't tell "genuinely open in Payload's Live Preview" apart from "embedded
 * in any other iframe," and inline text editing must never activate for a
 * real visitor in that case.
 *
 * A separate minimal listener rather than an addition to
 * `useScopedLivePreview`'s own return value, so this feature's blast radius
 * stays scoped to Pages and doesn't touch the Header/Footer/Settings/Post
 * call sites that hook already has.
 */
export function useIsLivePreviewActive(target: LivePreviewTarget): boolean {
  const [isActive, setIsActive] = useState(false)
  const targetKey = target.type === 'global' ? target.globalSlug : target.collectionSlug

  useEffect(() => {
    if (isActive) return

    const serverURL = getServerSideURL()
    const onMessage = (event: MessageEvent) => {
      if (!isLivePreviewEvent(event, serverURL)) return
      const matchesTarget =
        target.type === 'global'
          ? event.data.globalSlug === target.globalSlug
          : event.data.collectionSlug === target.collectionSlug
      if (!matchesTarget) return
      setIsActive(true)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // `targetKey` already covers target.globalSlug/collectionSlug; depending
    // on `target` itself would re-subscribe every render for callers that
    // pass an inline object literal (see useScopedLivePreview.ts's own note).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive, target.type, targetKey])

  return isActive
}
