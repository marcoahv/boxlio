import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  defaultPopulate: {
    name: true,
    email: true,
  },
  admin: {
    useAsTitle: 'name',
  },
  auth: true,
  access: {
    // No user yet means either an anonymous request or the very first admin
    // bootstrapping a fresh database - the latter must still be able to
    // register once, or the project could never create its first user.
    create: async ({ req }) => {
      if (req.user) return true
      const { totalDocs } = await req.payload.count({ collection: 'users' })
      return totalDocs === 0
    },
    read: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      type: 'text',
      name: 'name',
      required: true,
    }
  ],
}
