import { afterEach, describe, expect, it } from 'vitest'
import {
  findRowElementForBlockId,
  parseRowId,
  resolveBlockId,
  rowElementIdsAlongPath,
} from '@/utilities/blockRowLookup'

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

describe('row id resolution for a non-blocks field name', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  const getField = (values: Record<string, string>) => (path: string) =>
    path in values ? { value: values[path] } : undefined

  it('parses a navLinks row id the same way a blocks row id is parsed', () => {
    const row = document.createElement('div')
    row.id = 'navLinks-row-2'
    expect(parseRowId(row)).toEqual({ fieldName: 'navLinks', rowIndex: '2' })
  })

  it('resolves a ctaButtons row element to its own id field', () => {
    const row = document.createElement('div')
    row.id = 'ctaButtons-row-1'
    expect(resolveBlockId(row, getField({ 'ctaButtons.1.id': 'row-abc' }))).toBe('row-abc')
  })

  it('finds a navLinks row element by its row id, scanning the live DOM', () => {
    const row = document.createElement('div')
    row.id = 'navLinks-row-0'
    document.body.appendChild(row)
    const found = findRowElementForBlockId('nav-row-id', getField({ 'navLinks.0.id': 'nav-row-id' }))
    expect(found).toBe(row)
  })
})
