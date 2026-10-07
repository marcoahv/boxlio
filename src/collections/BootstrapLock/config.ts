import type { CollectionConfig } from 'payload'

/**
 * A single-document lock that makes Users.access.create's first-admin
 * bootstrap atomic. See
 * blueprint/history/fixes/first-admin-bootstrap-race.md for why a plain
 * payload.count() read-then-decide was a race.
 *
 * Hidden from the admin nav - this collection exists for exactly one
 * internal purpose and is never meant to be browsed or edited by a human.
 */
export const BootstrapLock: CollectionConfig = {
  slug: 'bootstrap-lock',
  admin: {
    hidden: true,
  },
  access: {
    // Nobody reads, updates, or deletes this through a real request.
    // Users.access.create is the only caller, via the Local API with no
    // `user` passed (overrideAccess defaults to true), so this deny-all
    // never actually runs in normal operation - it's the safe default if
    // anything else ever tries to touch this collection directly.
    read: () => false,
    create: () => false,
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'key',
      type: 'text',
      required: true,
      unique: true,
      defaultValue: 'first-admin',
    },
  ],
}
