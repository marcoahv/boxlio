import { getCachedGlobal } from '@/utilities/getGlobals'
import { FooterClient } from './FooterClient'

/**
 * Server half of the footer: fetches `header` (for its logo), `footer`
 * (its own fields), and `settings` (for the copyright site name), and hands
 * them to the client component.
 *
 * Nav links are the footer's own field (`footer.navLinks`), not a reuse of
 * `header.navLinks` — kept independent so the two navs can diverge. The logo
 * still comes from `header.logo` / `header.logoDark`; the footer has no logo
 * field of its own.
 */
export async function Footer() {
  const [header, footer, settings] = await Promise.all([
    getCachedGlobal('header', 2)(),
    getCachedGlobal('footer', 2)(),
    getCachedGlobal('settings')(),
  ])

  if (!header) return null

  return (
    <FooterClient
      initialFooter={footer}
      logo={header.logo}
      logoDark={header.logoDark}
      initialSettings={settings}
    />
  )
}
