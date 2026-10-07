import { describe, expect, it } from 'vitest'

import { toggleOpen } from '@/blocks/Accordion/openState'

describe('toggleOpen', () => {
  describe('with allowMultiple off', () => {
    it('opens an item when nothing is open', () => {
      expect(toggleOpen([], 'a', false)).toEqual(['a'])
    })

    it('replaces the open item instead of adding to it', () => {
      expect(toggleOpen(['a'], 'b', false)).toEqual(['b'])
    })

    it('closes an already-open item, leaving nothing open', () => {
      expect(toggleOpen(['a'], 'a', false)).toEqual([])
    })
  })

  describe('with allowMultiple on', () => {
    it('adds to the open items rather than replacing them', () => {
      expect(toggleOpen(['a'], 'b', true)).toEqual(['a', 'b'])
    })

    it('closes only the re-activated item and leaves the others open', () => {
      expect(toggleOpen(['a', 'b', 'c'], 'b', true)).toEqual(['a', 'c'])
    })

    it('closes an already-open item, leaving nothing open', () => {
      expect(toggleOpen(['a'], 'a', true)).toEqual([])
    })
  })

  it('never mutates the array it is given', () => {
    const openIds = ['a']
    toggleOpen(openIds, 'b', true)
    toggleOpen(openIds, 'a', true)
    expect(openIds).toEqual(['a'])
  })
})
