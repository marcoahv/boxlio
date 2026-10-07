import { CollectionAfterChangeHook, CollectionAfterDeleteHook } from 'payload'
import { Page } from '@/payload-types'
import { revalidatePath, revalidateTag } from 'next/cache'
import { safeRevalidate } from '@/utilities/safeRevalidate'

/**
 * Two calls, because they clear two different caches:
 *
 *  - revalidateTag  clears the unstable_cache entry holding the page's data
 *                   (see queryPageBySlug in app/(frontend)/[slug]/page.tsx).
 *                   revalidatePath does NOT reach unstable_cache entries, so
 *                   without this an edit updates the database but never the
 *                   rendered page.
 *  - revalidatePath clears the rendered route itself.
 *
 * Mirrors globals/hooks/revalidateGlobal.ts.
 */
const pathFor = (slug: string) => (slug === 'home' ? '/' : `/${slug}`)

export const updatePage: CollectionAfterChangeHook<Page> = ({ doc, req: { payload } }) => {
  const path = pathFor(doc.slug)
  safeRevalidate(`page ${doc.slug}`, () => {
    payload.logger.info(`Revalidating page ${doc.slug} (${path})`)
    revalidateTag(`page_${doc.slug}`)
    revalidatePath(path)
  })
}

export const deletePage: CollectionAfterDeleteHook<Page> = ({ doc }) => {
  safeRevalidate(`page ${doc.slug}`, () => {
    revalidateTag(`page_${doc.slug}`)
    revalidatePath(pathFor(doc.slug))
  })
}
