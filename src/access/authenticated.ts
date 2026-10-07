import type { Access } from 'payload'

/** True once any user is logged in to the admin panel - no roles yet. */
export const authenticated: Access = ({ req }) => Boolean(req.user)
