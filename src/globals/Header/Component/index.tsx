import { getCachedGlobal } from '@/utilities/getGlobals'
import { HeaderClient } from './HeaderClient'

/**
 * Server half of the header: fetches the `header` global and `settings`
 * (for Header Width/Height, moved to Settings' Whitespace tab) and hands
 * them to the client component.
 *
 * depth 2 resolves the nested docs — a navLink's related page (for its title
 * and slug) and each social link's uploaded icon.
 */
export async function Header() {
  const [header, settings] = await Promise.all([
    getCachedGlobal('header', 2)(),
    getCachedGlobal('settings')(),
  ])

  if (!header) return null

  return <HeaderClient initialHeader={header} initialSettings={settings} />
}
