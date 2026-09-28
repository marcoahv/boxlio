'use client'

import Link from 'next/link'
import type { Footer, Media, Setting } from '@/payload-types'
import { hrefForNavLink } from '@/utilities/navLink'
import { Container } from '@/components/primitives'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { useIsLivePreviewActive } from '@/utilities/useIsLivePreviewActive'
import { useEditableField } from '@/utilities/useEditableField'
import { useCrossDocumentEditHint } from '@/utilities/useCrossDocumentEditHint'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'
import { Logo } from '@/globals/Header/Component/Logo'

type FooterNavLinkItem = NonNullable<Footer['navLinks']>[number]

/**
 * Its own component (not inlined in the `.map()` below) so `useEditableField`
 * can be called at each item's own top level, per the Rules of Hooks - same
 * pattern as `FeatureGrid`'s `FeatureItem` / Header's `HeaderNavLinkItem`.
 */
function FooterNavLink({ item }: { item: FooterNavLinkItem }) {
  const href = hrefForNavLink(item)
  const labelField = useEditableField({ blockId: item.id, fieldPath: 'label', value: item.label })
  const showHint = useCrossDocumentEditHint(labelField.isEditable)
  if (!href) return null

  return (
    <li {...(showHint ? { 'data-cross-document-hint': 'Footer' } : {})}>
      <Link
        className="ui-link"
        href={href}
        target={item.newTab ? '_blank' : undefined}
        rel={item.newTab ? 'noopener noreferrer' : undefined}
        {...labelField.fieldProps}
      >
        {labelField.content}
      </Link>
    </li>
  )
}

/**
 * A separate component, not a `<span>` inlined in `FooterClient`'s own
 * render: `useEditableField` reads its editability off `EditableFieldContext`
 * via `useIsEditableField()`, which only sees the value from a provider
 * that's an actual JSX ancestor - a provider placed around this component's
 * own element (not around code in the *caller's* render body) is what makes
 * that context reach here. Gated on `settings`, independently of Footer's own
 * `isFooterEditable` - see the module comment above `FooterClient`.
 */
function FooterCopyrightSiteName({ siteName }: { siteName: string }) {
  const siteNameField = useEditableField({
    blockId: 'siteName',
    fieldPath: 'siteName',
    value: siteName,
  })
  const showHint = useCrossDocumentEditHint(siteNameField.isEditable)
  return (
    <span
      {...siteNameField.fieldProps}
      {...(showHint ? { 'data-cross-document-hint': 'Site Identity › Information' } : {})}
    >
      {siteNameField.content}
    </span>
  )
}

/**
 * `logo` / `logoDark` are a one-time snapshot from Header, not wired to a
 * live-preview hook - they don't update during a Footer preview session even
 * if Header is edited concurrently. Deliberate: matches how Post's
 * breadcrumbs stay non-reactive in feature 15. `siteName` (from Settings) is
 * reactive via its own hook below, added in feature 20, and - as of feature
 * 29b - independently editable: it's Settings' own field rendered in place
 * here, so its "owning document" for inline-editing purposes is `settings`,
 * not `footer` (see the separate `isSettingsEditable` flag below).
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
  const isFooterEditable = useIsLivePreviewActive({ type: 'global', globalSlug: 'footer' })
  const isSettingsEditable = useIsLivePreviewActive({ type: 'global', globalSlug: 'settings' })

  return (
    <footer className="footer" data-surface={surface ?? 'default'} data-spacing="normal">
      <Container className="ui-section-container">
        <Logo logo={logo} logoDark={logoDark} className="footer__logo" />

        {navLinks && navLinks.length > 0 && (
          <nav className="footer__nav" aria-label="Footer navigation">
            <ul className="footer__links">
              <EditableFieldProvider value={isFooterEditable}>
                {navLinks.map((item) => (
                  <FooterNavLink key={item.id} item={item} />
                ))}
              </EditableFieldProvider>
            </ul>
          </nav>
        )}

        <p className="footer__copyright">
          © {new Date().getFullYear()}{' '}
          <EditableFieldProvider value={isSettingsEditable}>
            <FooterCopyrightSiteName siteName={siteName} />
          </EditableFieldProvider>
          . All rights reserved.
        </p>
      </Container>
    </footer>
  )
}
