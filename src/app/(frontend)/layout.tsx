import React from 'react'
import './styles/index.css'
import { GoogleTagManager } from '@next/third-parties/google'
import { Metadata } from 'next'
import Script from 'next/script'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { Header } from '@/globals/Header/Component'
import { Footer } from '@/globals/Footer/Component'
import { SettingsLivePreviewSync } from '@/globals/Settings/Component/SettingsLivePreviewSync'
import { LivePreviewNavGuard } from '@/utilities/LivePreviewNavGuard'
import { isDoc } from '@/utilities/isDoc'
import type { Media } from '@/payload-types'
import { themeInitScript } from '@/utilities/theme'
import { fontVariables } from './fonts'

const FALLBACK_NAME = 'Boxlio'
const FALLBACK_DESCRIPTION = 'A site built with the site builder.'

/** Builds one favicon entry from a header icon field, or null if unset. */
function iconDescriptor(icon: string | Media | null | undefined, media?: string) {
  if (!isDoc<Media>(icon) || !icon.url) return null
  return {
    url: icon.url,
    type: icon.mimeType ?? undefined,
    sizes: icon.width && icon.height ? `${icon.width}x${icon.height}` : undefined,
    media,
  }
}

export async function generateMetadata(): Promise<Metadata> {
  // depth 1 so settings.icon / settings.iconDark resolve to full Media docs
  // rather than bare relationship ids.
  const settings = await getCachedGlobal('settings', 1)()

  // Light entry carries no media query, so it also covers dark mode when no
  // dark-mode icon was uploaded — there is nothing to override it with.
  const icons = [
    iconDescriptor(settings.icon),
    iconDescriptor(settings.iconDark, '(prefers-color-scheme: dark)'),
  ].filter((icon): icon is NonNullable<typeof icon> => icon !== null)

  return {
    metadataBase: new URL(process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:3000'),
    description: settings.siteDescription || FALLBACK_DESCRIPTION,
    title: {
      default: settings.siteName || FALLBACK_NAME,
      template: `%s | ${settings.siteName || FALLBACK_NAME}`,
    },
    ...(icons.length > 0 ? { icons } : {}),
  }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const { children } = props

  const settings = await getCachedGlobal('settings', 1)()

  // The .variable classes define --font-montserrat / --font-vollkorn /
  // --font-doto on <html>; the font-primary utility resolves against them.
  return (
    <html
      lang="en"
      className={`${fontVariables} font-primary`}
      data-image-radius={settings.imageRadius ?? 'md'}
      data-button-radius={settings.buttonRadius ?? 'none'}
      data-image-shadow={settings.imageShadow ?? 'none'}
      data-button-shadow={settings.buttonShadow ?? 'none'}
      data-card-shadow={settings.cardShadow ?? 'none'}
      data-heading-font={settings.headingFont ?? 'primary'}
      data-body-font={settings.bodyFont ?? 'primary'}
      data-heading-scale={settings.headingScale ?? 'md'}
      data-main-heading-size={settings.mainHeadingSize ?? 'default'}
      data-sections-width={settings.sectionsWidth ?? 'default'}
      data-section-scale={settings.sectionScale ?? 'md'}
      data-hero-width={settings.heroWidth ?? 'default'}
      data-hero-spacing={settings.heroSpacing ?? 'normal'}
      data-rich-text-width={settings.richTextWidth ?? 'narrow'}
      data-rich-text-spacing={settings.richTextSpacing ?? 'normal'}
      // Arbitrary hex values, unlike the enum-driven data-* attributes above -
      // an inline style on <html> overrides _base-tokens.css's :root rule for
      // the same six custom properties (same element, higher specificity).
      style={{
        '--color-primary': settings.primaryColor ?? '#d6c1a1',
        '--color-primary-light': settings.primaryColorLight ?? '#e2dbcf',
        '--color-primary-dark': settings.primaryColorDark ?? '#b2905c',
        '--color-secondary': settings.secondaryColor ?? '#49b7d2',
        '--color-secondary-light': settings.secondaryColorLight ?? '#9fd0dc',
        '--color-secondary-dark': settings.secondaryColorDark ?? '#137c95',
      } as React.CSSProperties}
      // The theme-init script below sets data-theme on this element before
      // hydration runs, so React sees an attribute the server render didn't
      // produce. That is intentional (it's what avoids a flash of the wrong
      // theme), so the mismatch warning is suppressed rather than fixed.
      suppressHydrationWarning
    >
      {settings.gtmCode && <GoogleTagManager gtmId={settings.gtmCode} />}
      <body>
        <Script
          id="theme-init"
          strategy="beforeInteractive"
          dangerouslySetInnerHTML={{ __html: themeInitScript() }}
        />
        <SettingsLivePreviewSync initialSettings={settings} />
        <LivePreviewNavGuard />
        <Header />
        {/* No offset class here on purpose: whether <main> needs one — and how
            much — depends on the header's own position and height, both
            editor-chosen. globals/Header/Component/_header.css applies it via a
            body:has() rule keyed off the header's data attributes, so a fixed
            header always gets the right padding and a static one correctly
            gets none. */}
        <main>{children}</main>
        <Footer />
      </body>
    </html>
  )
}
