import { type CollectionConfig, slugField } from 'payload'
import { revalidateCategories, deleteCategories } from './hooks/revalidateCategories'

export const Categories: CollectionConfig = {
  slug: 'categories',
  admin: {
    useAsTitle: 'name',
    group: 'Collections',
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [revalidateCategories],
    afterDelete: [deleteCategories],
  },
  fields: [
    {
      type: 'text',
      name: 'name',
    },
    slugField({
      useAsSlug: 'name',
    }),
    {
      type: 'join',
      collection: 'posts',
      on: 'category',
      name: 'relatedPosts'
    }
  ]
}