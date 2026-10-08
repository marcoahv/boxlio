import { describe, expect, it } from 'vitest'

import { instantSlideIndices, nextIndex, prevIndex, slideOffset } from '@/blocks/Carousel/slideIndex'

describe('nextIndex', () => {
  it('advances by one', () => {
    expect(nextIndex(0, 3)).toBe(1)
    expect(nextIndex(1, 3)).toBe(2)
  })

  it('wraps from the last slide back to the first', () => {
    expect(nextIndex(2, 3)).toBe(0)
  })

  it('stays at 0 with a single slide', () => {
    expect(nextIndex(0, 1)).toBe(0)
  })
})

describe('prevIndex', () => {
  it('retreats by one', () => {
    expect(prevIndex(2, 3)).toBe(1)
    expect(prevIndex(1, 3)).toBe(0)
  })

  it('wraps from the first slide back to the last', () => {
    expect(prevIndex(0, 3)).toBe(2)
  })

  it('stays at 0 with a single slide', () => {
    expect(prevIndex(0, 1)).toBe(0)
  })
})

describe('slideOffset', () => {
  it('is 0 for the active slide itself', () => {
    expect(slideOffset(1, 1, 3)).toBe(0)
  })

  it('is positive for a slide ahead of active, negative for one behind', () => {
    expect(slideOffset(2, 1, 3)).toBe(1)
    expect(slideOffset(0, 1, 3)).toBe(-1)
  })

  it('wraps the long way around the end to the short way, matching nextIndex/prevIndex', () => {
    // nextIndex(2, 3) wraps to 0 - the slide that just became active was
    // "ahead" by the short path (+1), not the long one (-2).
    expect(slideOffset(0, 2, 3)).toBe(1)
    // prevIndex(0, 3) wraps to 2 - "behind" by the short path (-1), not +2.
    expect(slideOffset(2, 0, 3)).toBe(-1)
  })

  it('handles a jump across several slides at once (e.g. the admin-field-focus jump)', () => {
    expect(slideOffset(4, 0, 6)).toBe(-2)
    expect(slideOffset(2, 0, 6)).toBe(2)
  })

  it('is 0 with a single slide', () => {
    expect(slideOffset(0, 0, 1)).toBe(0)
  })
})

describe('instantSlideIndices', () => {
  it('flags the one uninvolved slide whose shortest side flips on an adjacent step', () => {
    // Regression test for the reported bug: with 3 slides, going active
    // 1 -> 2 is a normal adjacent Next step for slides 1 and 2, but slide
    // 0's shortest-path offset flips from -1 to +1 (a jump of 2) even
    // though it wasn't part of this step at all.
    expect(instantSlideIndices(1, 2, 3)).toEqual(new Set([0]))
    expect(instantSlideIndices(0, 1, 3)).toEqual(new Set([2]))
    expect(instantSlideIndices(2, 0, 3)).toEqual(new Set([1]))
  })

  it('is empty when the active slide does not actually change', () => {
    expect(instantSlideIndices(1, 1, 3)).toEqual(new Set())
  })

  it('flags every slide on a multi-slide jump (e.g. the admin-field-focus jump landing several slides away)', () => {
    // Moving active by more than one position shifts every slide's offset
    // by that same distance (not just the one that would otherwise flip
    // sign on a single adjacent step) - a direct jump has no "slide
    // smoothly past the intervening ones" case; the whole move is instant.
    expect(instantSlideIndices(0, 5, 10).size).toBe(10)
    expect(instantSlideIndices(0, 2, 10).size).toBe(10)
  })
})
