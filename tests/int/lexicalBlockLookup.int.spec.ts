import { describe, expect, it } from 'vitest'
import { findEnclosingBlockId } from '@/utilities/lexicalBlockLookup'

type FakeNode = {
  isBlock: boolean
  id?: string
  getParent(): FakeNode | null
  getFields(): { id?: string }
}

const fakeNode = (opts: { isBlock?: boolean; id?: string; parent?: FakeNode | null }): FakeNode => {
  const parent = opts.parent ?? null
  return {
    isBlock: opts.isBlock ?? false,
    id: opts.id,
    getParent: () => parent,
    getFields: () => ({ id: opts.id }),
  }
}

const isBlockNode = (node: unknown): node is FakeNode =>
  Boolean(node) && typeof node === 'object' && (node as FakeNode).isBlock === true

describe('findEnclosingBlockId', () => {
  it('returns the id of an immediate block match', () => {
    const block = fakeNode({ isBlock: true, id: 'block-1' })
    expect(findEnclosingBlockId(block, isBlockNode)).toBe('block-1')
  })

  it('finds a block several levels up the parent chain', () => {
    const block = fakeNode({ isBlock: true, id: 'block-2' })
    const child = fakeNode({ parent: block })
    const grandchild = fakeNode({ parent: child })
    expect(findEnclosingBlockId(grandchild, isBlockNode)).toBe('block-2')
  })

  it('returns undefined when no ancestor matches', () => {
    const root = fakeNode({})
    const child = fakeNode({ parent: root })
    expect(findEnclosingBlockId(child, isBlockNode)).toBeUndefined()
  })

  it('returns undefined for a null start node', () => {
    expect(findEnclosingBlockId(null, isBlockNode)).toBeUndefined()
  })
})
