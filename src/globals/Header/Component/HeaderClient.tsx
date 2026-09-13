'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import type { Header, Media } from '@/payload-types'
import { isDoc } from '@/utilities/isDoc'
import { hrefForNavLink } from '@/utilities/navLink'
import { Container } from '@/components/primitives'
import { isThemeToggleEnabled } from '@/utilities/theme'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { Logo } from './Logo'
import { ThemeToggle } from './ThemeToggle'

export function HeaderClient({ initialHeader }: { initialHeader: Header }) {
  const header = useScopedLivePreview<Header>({
    target: { type: 'global', globalSlug: 'header' },
    initialData: initialHeader,
    serverURL: getServerSideURL(),
    depth: 2,
  })

  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const navRef = useRef<HTMLElement>(null)
  const pathname = usePathname()
  const [prevPathname, setPrevPathname] = useState(pathname)

  const close = useCallback(() => setOpen(false), [])

  const {
    logo,
    logoDark,
    navLinks,
    socialLinks,
    ctaButtons,
    surface,
    width,
    position,
    height,
    transparentAtTop,
    showThemeToggle,
  } = header

  // Close the drawer on navigation. Without this it survives a route change
  // and covers the page the visitor just asked for. Adjusted during render
  // (React's documented pattern for "reset state when a value changes")
  // rather than in an effect, so there's no post-commit flash of the drawer
  // still open over the new page.
  if (pathname !== prevPathname) {
    setPrevPathname(pathname)
    setOpen(false)
  }

  // Only relevant when the bar can actually turn transparent — a header that
  // always shows its surface has nothing to react to on scroll.
  const tracksScroll = transparentAtTop !== false

  // Passive listener: this only reads scrollY, so it must never block scrolling.
  useEffect(() => {
    if (!tracksScroll) return
    const onScroll = () => setScrolled(window.scrollY > 0)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [tracksScroll])

  // While the drawer is open: lock body scroll, close on Escape, and keep Tab
  // inside the drawer so focus cannot wander onto the page hidden behind it.
  useEffect(() => {
    if (!open) return

    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false)
        return
      }
      if (e.key !== 'Tab' || !navRef.current) return

      const focusable = navRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusable.length === 0) return

      const first = focusable[0]
      const last = focusable[focusable.length - 1]

      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault()
        first.focus()
      }
    }

    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  return (
    <header
      className={`header ${scrolled ? 'header--scrolled' : ''}`}
      data-surface={surface ?? 'default'}
      data-position={position ?? 'fixed'}
      data-height={height ?? 'normal'}
      data-transparent={tracksScroll}
    >
      <Container width={width}>
        <div className="header__bar">
          <Logo
            logo={logo}
            logoDark={logoDark}
            className="header__logo"
          />

          {/* Groups the theme toggle, hamburger, and nav so justify-content:
              space-between on .header__bar puts the logo on one side and
              everything else on the other, rather than spreading three
              separate flex children across the whole bar. */}
          <div className="header__controls">
            {isThemeToggleEnabled(showThemeToggle) && <ThemeToggle />}

            <button
              className="header__toggle"
              onClick={() => setOpen((v) => !v)}
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              aria-controls="header-nav"
            >
              {open ? (
                <X size={28} aria-hidden />
              ) : (
                <Menu size={28} aria-hidden />
              )}
            </button>

            {/* Rendered once. CSS reshapes it into a drawer below atMedium and an
                inline row above — see ./_header.css. */}
            <nav
              id="header-nav"
              ref={navRef}
              className={`header__nav ${open ? 'header__nav--open' : ''}`}
              aria-label="Main navigation"
            >
              {navLinks && navLinks.length > 0 && (
                <ul className="header__links">
                  {navLinks.map((item) => {
                    const href = hrefForNavLink(item)
                    if (!href) return null
                    return (
                      <li key={item.id}>
                        <Link
                          className="ui-link"
                          href={href}
                          target={item.newTab ? '_blank' : undefined}
                          rel={
                            item.newTab
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          onClick={close}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              {socialLinks && socialLinks.length > 0 && (
                <ul className="header__social">
                  {socialLinks.map((item) => {
                    if (!item.url) return null
                    return (
                      <li key={item.id}>
                        <Link
                          className="ui-link"
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          aria-label={item.platform}
                          onClick={close}
                        >
                          {isDoc<Media>(item.icon) && item.icon.url && (
                            <Image
                              src={item.icon.url}
                              alt=""
                              width={24}
                              height={24}
                              aria-hidden
                            />
                          )}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}

              {ctaButtons && ctaButtons.length > 0 && (
                <ul className="header__actions">
                  {ctaButtons.map((item) => {
                    if (!item.url) return null
                    return (
                      <li key={item.id}>
                        <Link
                          href={item.url}
                          className={[
                            'ui-btn',
                            {
                              outline: 'ui-btn-outline',
                              ghost: 'ui-btn-ghost',
                            }[item.variant ?? ''],
                            item.color === 'secondary'
                              ? 'ui-btn-secondary'
                              : '',
                          ]
                            .filter(Boolean)
                            .join(' ')}
                          onClick={close}
                        >
                          {item.label}
                        </Link>
                      </li>
                    )
                  })}
                </ul>
              )}
            </nav>
          </div>

          <div
            className={`header__overlay ${open ? 'header__overlay--visible' : ''}`}
            onClick={close}
            aria-hidden
          />
        </div>
      </Container>
    </header>
  )
}
