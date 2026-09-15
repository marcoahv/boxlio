import { PayloadIcon, PayloadLogo } from '@payloadcms/ui/shared'
import type { Media } from '@/payload-types'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { isDoc } from '@/utilities/isDoc'

const imgStyle = { width: '100%', height: '100%', objectFit: 'contain' } as const

/**
 * Fetches the site's uploaded Site Icon (Settings.icon) for AdminIcon below,
 * returning `null` on a fetch failure or an unpopulated icon. Isolated from
 * JSX construction (React doesn't render JSX synchronously, so a try/catch
 * around a `return <Foo />` doesn't actually catch its render errors) - only
 * this data fetch is guarded, so a Settings-read failure can never block the
 * dashboard nav from rendering.
 */
async function getSettingsIconSafely(): Promise<Media | null> {
  try {
    const settings = await getCachedGlobal('settings', 1)()
    const icon = settings.icon
    return isDoc<Media>(icon) && icon.url ? icon : null
  } catch {
    return null
  }
}

/**
 * Fetches the site's uploaded Logo (Header.logo) for AdminLogo below, same
 * shape as `getSettingsIconSafely` above but for the login page.
 */
async function getHeaderLogoSafely(): Promise<Media | null> {
  try {
    const header = await getCachedGlobal('header', 1)()
    const logo = header.logo
    return isDoc<Media>(logo) && logo.url ? logo : null
  } catch {
    return null
  }
}

/**
 * Replaces Payload's own nav icon with the site's uploaded Site Icon
 * (Settings.icon), so a cloned site's admin panel reflects its own branding.
 * Falls back to Payload's stock icon on a fetch failure or an unpopulated
 * icon.
 */
export async function AdminIcon() {
  const icon = await getSettingsIconSafely()
  if (icon) {
    // eslint-disable-next-line @next/next/no-img-element -- admin-uploaded image of arbitrary size, see Header/Component/Logo.tsx
    return <img className="graphic-icon" src={icon.url!} alt="" style={imgStyle} />
  }
  return <PayloadIcon />
}

/**
 * Replaces Payload's own login-page logo with the site's uploaded Logo
 * (Header.logo), so a cloned site's login page reflects its own branding.
 * Falls back to Payload's stock logo on a fetch failure or an unpopulated
 * logo.
 */
export async function AdminLogo() {
  const logo = await getHeaderLogoSafely()
  if (logo) {
    // eslint-disable-next-line @next/next/no-img-element -- see AdminIcon above
    return <img className="graphic-logo" src={logo.url!} alt={logo.alt} style={imgStyle} />
  }
  return <PayloadLogo />
}
