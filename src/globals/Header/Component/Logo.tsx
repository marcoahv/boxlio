import Link from 'next/link'
import type { Media } from '@/payload-types'
import { isDoc } from '@/utilities/isDoc'

/**
 * Surface-aware logo.
 *
 * Renders two real logo assets (`logo` and `logoDark`) and lets CSS in
 * _header.css decide which is visible for the current surface, OS color
 * scheme, and — while the bar is transparent — the section underneath it.
 * `logoDark` falls back to `logo` when the editor hasn't uploaded one, so a
 * header never ends up with a missing image.
 */
export function Logo({
  logo,
  logoDark,
  className,
}: {
  logo?: Media | string | null
  logoDark?: Media | string | null
  className?: string
}) {
  const light = isDoc<Media>(logo) && logo.url ? logo : null
  const dark = isDoc<Media>(logoDark) && logoDark.url ? logoDark : light

  if (!light || !dark) return null

  return (
    <Link className={className} href="/" aria-label="Home">
      {/* aria-hidden: the link already carries the accessible name, and without
          this the logo is announced twice. */}
      <span className="ui-logo" aria-hidden="true">
        {/* eslint-disable-next-line @next/next/no-img-element -- admin-uploaded
            SVGs of arbitrary size; next/image would reject SVG sources
            (no dangerouslyAllowSVG) and requires dimensions this data can't
            always guarantee. */}
        <img
          className="ui-logo__img ui-logo__img--logo"
          src={light.url!}
          width={light.width ?? undefined}
          height={light.height ?? undefined}
          alt=""
        />
        {/* eslint-disable-next-line @next/next/no-img-element -- see above */}
        <img
          className="ui-logo__img ui-logo__img--logo-dark"
          src={dark.url!}
          width={dark.width ?? undefined}
          height={dark.height ?? undefined}
          alt=""
        />
      </span>
    </Link>
  )
}
