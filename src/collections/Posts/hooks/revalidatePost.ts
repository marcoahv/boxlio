import {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'
import { Post } from '@/payload-types'
import { revalidatePath, revalidateTag } from 'next/cache'
import { safeRevalidate } from '@/utilities/safeRevalidate'

export const updatePost: CollectionAfterChangeHook<Post> = ({
  doc,
  req: { payload },
}) => {
  const path = `/blog/${doc.slug}/`
  safeRevalidate(`post ${doc.slug}`, () => {
    payload.logger.info(`Revalidating path: ${path}`)
    revalidatePath(path)
    revalidateTag('blog', 'max')
  })
}

export const deletePost: CollectionAfterDeleteHook<Post> = ({
  doc,
}) => {
  const path = `/blog/${doc.slug}`
  safeRevalidate(`post ${doc.slug}`, () => {
    revalidatePath(path)
    revalidateTag('blog', 'max')
  })
}
