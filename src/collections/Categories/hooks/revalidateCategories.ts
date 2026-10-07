import {
  CollectionAfterChangeHook,
  CollectionAfterDeleteHook,
} from 'payload'
import { revalidateTag } from 'next/cache'
import { safeRevalidate } from '@/utilities/safeRevalidate'

export const revalidateCategories: CollectionAfterChangeHook = () => {
  safeRevalidate('categories', () => {
    revalidateTag('blog', 'max')
  })
}

export const deleteCategories: CollectionAfterDeleteHook = () => {
  safeRevalidate('categories', () => {
    revalidateTag('blog', 'max')
  })
}
