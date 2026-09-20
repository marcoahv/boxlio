import { describe, expect, it, vi } from 'vitest'
import { Users } from '@/collections/Users/config'
import type { PayloadRequest } from 'payload'

const buildReq = ({
  user,
  totalDocs,
}: {
  user?: object
  totalDocs: number
}): PayloadRequest =>
  ({
    user,
    payload: {
      count: vi.fn().mockResolvedValue({ totalDocs }),
    },
  }) as unknown as PayloadRequest

describe('Users access.create', () => {
  it('allows an anonymous request to create the first user on an empty database', async () => {
    const req = buildReq({ totalDocs: 0 })
    await expect(Users.access!.create!({ req })).resolves.toBe(true)
  })

  it('blocks an anonymous request once at least one user already exists', async () => {
    const req = buildReq({ totalDocs: 1 })
    await expect(Users.access!.create!({ req })).resolves.toBe(false)
  })

  it('allows an authenticated request regardless of existing user count', async () => {
    const req = buildReq({ user: { id: '1' }, totalDocs: 5 })
    await expect(Users.access!.create!({ req })).resolves.toBe(true)
  })
})

describe('Users access.read/update/delete', () => {
  it('requires an authenticated user', () => {
    const anonymous = buildReq({ totalDocs: 0 })
    const authenticated = buildReq({ user: { id: '1' }, totalDocs: 0 })

    for (const op of ['read', 'update', 'delete'] as const) {
      expect(Users.access![op]!({ req: anonymous })).toBe(false)
      expect(Users.access![op]!({ req: authenticated })).toBe(true)
    }
  })
})
