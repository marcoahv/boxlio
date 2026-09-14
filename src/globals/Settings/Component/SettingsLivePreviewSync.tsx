'use client'

import { useEffect } from 'react'
import type { Setting } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'

/**
 * Renders nothing - its only job is keeping `<html data-image-radius>` and
 * `<html data-button-radius>` in sync with Settings during a live-preview
 * session, the same `document.documentElement.setAttribute` technique
 * `ThemeToggle` uses for `data-theme`. Mounted once in the root layout so
 * it's present on whatever route Settings' live preview opens (every global
 * resolves to `/`).
 */
export function SettingsLivePreviewSync({ initialSettings }: { initialSettings: Setting }) {
  const { imageRadius, buttonRadius } = useScopedLivePreview<Setting>({
    target: { type: 'global', globalSlug: 'settings' },
    initialData: initialSettings,
    serverURL: getServerSideURL(),
    depth: 2,
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-image-radius', imageRadius ?? 'md')
  }, [imageRadius])

  useEffect(() => {
    document.documentElement.setAttribute('data-button-radius', buttonRadius ?? 'none')
  }, [buttonRadius])

  return null
}
