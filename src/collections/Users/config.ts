import type { CollectionConfig } from 'payload'
import { authenticated } from '@/access/authenticated'

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

      // Fast-path guard, not the race fix itself: an already-initialized
      // site (totalDocs > 0) is never eligible, regardless of whether the
      // bootstrap-lock below has ever been claimed - without this, a site
      // that already had real users before this collection existed would
      // let the very next anonymous request claim an empty lock and
      // self-register. This read can be stale under concurrent load; that's
      // fine, because it only ever says yes to proceed toward the atomic
      // check below, never the final word.
      const { totalDocs } = await req.payload.count({ collection: 'users' })
      if (totalDocs > 0) return false

      try {
        // Atomically claim the bootstrap lock. MongoDB's unique index on
        // `key` means only the first of any number of concurrent requests
        // can insert this document; every later one throws a duplicate-key
        // error here and is denied - closing the race the count() read
        // above leaves open on its own. See
        // blueprint/history/fixes/first-admin-bootstrap-race.md.
        await req.payload.create({ collection: 'bootstrap-lock', data: {} })
        return true
      } catch {
        return false
      }
    },
    read: authenticated,
    update: authenticated,
    delete: authenticated,
  },
  fields: [
    {
      type: 'text',
      name: 'name',
      required: true,
    }
  ],
}
