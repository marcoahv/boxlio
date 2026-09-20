import { GlobalAfterChangeHook } from 'payload'
import { revalidatePath, revalidateTag } from 'next/cache'

/**
 * Two calls, same reason as collections/Pages/hooks/revalidatePage.ts:
 * revalidateTag clears the unstable_cache entry holding this global's data
 * (getCachedGlobal in utilities/getGlobals.ts); revalidatePath does not
 * reach that cache, but is what clears the already-rendered route so the
 * next request actually re-invokes the layout instead of reusing a
 * previously rendered copy. Header/Footer/Settings all render in the root
 * layout (app/(frontend)/layout.tsx), shared by every route, so a change
 * here isn't confined to one path the way a Page edit is - `'layout'`
 * busts every route under it, not just `/` itself.
 */
export const revalidateGlobal: GlobalAfterChangeHook = ({
  req: { payload },
  global: { slug },
}) => {
  payload.logger.info(`Revalidating ${slug}`)
  revalidateTag(`global_${slug}`, 'max')
  revalidatePath('/', 'layout')
}
