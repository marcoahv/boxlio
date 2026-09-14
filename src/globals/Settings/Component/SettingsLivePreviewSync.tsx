'use client'

import { useEffect } from 'react'
import type { Setting } from '@/payload-types'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'

/**
 * Renders nothing - its only job is keeping `<html data-image-radius>`,
 * `<html data-button-radius>`, the `data-*-shadow` attributes, and the six
 * `--color-primary`/`--color-secondary` custom properties in sync with
 * Settings during a live-preview session, the same
 * `document.documentElement.setAttribute` technique `ThemeToggle` uses for
 * `data-theme` (colors use `style.setProperty` instead, since they're
 * arbitrary hex values rather than a small enum). Mounted once in the root
 * layout so it's present on whatever route Settings' live preview opens
 * (every global resolves to `/`).
 */
export function SettingsLivePreviewSync({ initialSettings }: { initialSettings: Setting }) {
  const {
    imageRadius,
    buttonRadius,
    imageShadow,
    buttonShadow,
    cardShadow,
    primaryColor,
    primaryColorLight,
    primaryColorDark,
    secondaryColor,
    secondaryColorLight,
    secondaryColorDark,
  } = useScopedLivePreview<Setting>({
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

  useEffect(() => {
    document.documentElement.setAttribute('data-image-shadow', imageShadow ?? 'none')
  }, [imageShadow])

  useEffect(() => {
    document.documentElement.setAttribute('data-button-shadow', buttonShadow ?? 'none')
  }, [buttonShadow])

  useEffect(() => {
    document.documentElement.setAttribute('data-card-shadow', cardShadow ?? 'none')
  }, [cardShadow])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-primary', primaryColor ?? '#d6c1a1')
  }, [primaryColor])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--color-primary-light',
      primaryColorLight ?? '#e2dbcf',
    )
  }, [primaryColorLight])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--color-primary-dark',
      primaryColorDark ?? '#b2905c',
    )
  }, [primaryColorDark])

  useEffect(() => {
    document.documentElement.style.setProperty('--color-secondary', secondaryColor ?? '#49b7d2')
  }, [secondaryColor])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--color-secondary-light',
      secondaryColorLight ?? '#9fd0dc',
    )
  }, [secondaryColorLight])

  useEffect(() => {
    document.documentElement.style.setProperty(
      '--color-secondary-dark',
      secondaryColorDark ?? '#137c95',
    )
  }, [secondaryColorDark])

  return null
}
