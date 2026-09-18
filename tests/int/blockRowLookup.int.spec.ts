import { describe, expect, it } from 'vitest'
import { rowElementIdsAlongPath } from '@/utilities/blockRowLookup'

describe('rowElementIdsAlongPath', () => {
  it('resolves a top-level block field to its block row', () => {
    expect(rowElementIdsAlongPath('blocks.2.heading')).toEqual(['blocks-row-2'])
  })

  it('resolves a field nested in an array to both rows, outermost first', () => {
    expect(rowElementIdsAlongPath('blocks.2.features.0.title')).toEqual([
      'blocks-row-2',
      'blocks-2-features-row-0',
    ])
  })

  it('handles the blogBlocks field name the same way', () => {
    expect(rowElementIdsAlongPath('blogBlocks.0.heading')).toEqual(['blogBlocks-row-0'])
  })

  it('keeps multi-digit row indexes intact', () => {
    expect(rowElementIdsAlongPath('blocks.12.features.10.body')).toEqual([
      'blocks-row-12',
      'blocks-12-features-row-10',
    ])
  })

  it('returns nothing for a path with no repeatable row', () => {
    expect(rowElementIdsAlongPath('title')).toEqual([])
  })
})
