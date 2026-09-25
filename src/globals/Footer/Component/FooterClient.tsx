'use client'

import Link from 'next/link'
import type { Footer, Media, Setting } from '@/payload-types'
import { hrefForNavLink } from '@/utilities/navLink'
import { Container } from '@/components/primitives'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { Logo } from '@/globals/Header/Component/Logo'

/**
 * `logo` / `logoDark` are a one-time snapshot from Header, not wired to a
 * live-preview hook - they don't update during a Footer preview session even
 * if Header is edited concurrently. Deliberate: matches how Post's
 * breadcrumbs stay non-reactive in feature 15. `siteName` (from Settings) is
 * reactive via its own hook below, added in feature 20.
 */
export function FooterClient({
  initialFooter,
  logo,
  logoDark,
  initialSettings,
}: {
  initialFooter: Footer
  logo: string | Media
  logoDark?: string | Media | null
  initialSettings: Setting
}) {
  const { navLinks, surface } = useScopedLivePreview<Footer>({
    target: { type: 'global', globalSlug: 'footer' },
    initialData: initialFooter,
    serverURL: getServerSideURL(),
    depth: 2,
  })
  const { siteName } = useScopedLivePreview<Setting>({
    target: { type: 'global', globalSlug: 'settings' },
    initialData: initialSettings,
    serverURL: getServerSideURL(),
    depth: 2,
  })

  return (
    <footer className="footer" data-surface={surface ?? 'default'} data-spacing="normal">
      <Container className="ui-section-container">
        <Logo logo={logo} logoDark={logoDark} className="footer__logo" />

        {navLinks && navLinks.length > 0 && (
          <nav className="footer__nav" aria-label="Footer navigation">
            <ul className="footer__links">
              {navLinks.map((item) => {
                const href = hrefForNavLink(item)
                if (!href) return null
                return (
                  <li key={item.id}>
                    <Link
                      className="ui-link"
                      href={href}
                      target={item.newTab ? '_blank' : undefined}
                      rel={item.newTab ? 'noopener noreferrer' : undefined}
                    >
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </nav>
        )}

        <p className="footer__copyright">
          © {new Date().getFullYear()} {siteName}. All rights reserved.
        </p>
      </Container>
    </footer>
  )
}
