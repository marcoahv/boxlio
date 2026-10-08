/**
 * Wrap-around slide index helpers. Pure and exported on their own so the
 * wrap rule is testable without mounting the block, following Accordion's
 * `openState.ts` convention - see tests/int/carouselSlideIndex.int.spec.ts.
 * Drive both manual Previous/Next and autoplay's own advance off the same
 * two functions, so they can never disagree about where "next" wraps to.
 */

export function nextIndex(current: number, count: number): number {
  if (count <= 0) return 0
  return (current + 1) % count
}

export function prevIndex(current: number, count: number): number {
  if (count <= 0) return 0
  return (current - 1 + count) % count
}

/**
 * Signed distance from `active` to `index`, going whichever way around the
 * circle is shorter - the Slide transition's track offset (in slide
 * widths; the CSS reads it as `calc(var(--ui-carousel-offset) * 100%)`).
 * Without wrapping, jumping from the last slide back to the first (`next`
 * at the end) would compute the longest way around and visually drag the
 * whole track across every slide in between - the same cut Previous/Next
 * already make instantly via `nextIndex`/`prevIndex`'s own `% count`, just
 * carried through to this signed version so the Slide transition agrees
 * with their direction instead of contradicting it at the wrap point.
 *
 * Side effect of "shortest way around" being recomputed fresh on every
 * call: for a slide that ISN'T the one entering or exiting a given step,
 * its own shortest side can flip between two consecutive active values -
 * e.g. with 3 slides, going active 1 -> 2 changes slide 0's offset from -1
 * to +1 (a jump of 2), even though slide 0 wasn't part of that step at
 * all. Animating that jump would sweep slide 0 visibly across the screen.
 * This function still returns the mathematically correct shortest offset
 * either way - the Carousel component is what detects a jump larger than
 * one slide-width (comparing against the previous render) and renders
 * that specific update instantly instead of animating it.
 */
export function slideOffset(index: number, active: number, count: number): number {
  if (count <= 0) return 0
  let offset = index - active
  const half = count / 2
  if (offset > half) offset -= count
  if (offset < -half) offset += count
  return offset
}

/**
 * Which slide indices need their Slide-transition move rendered instantly
 * (no animated transform) rather than transitioned, for a step from
 * `fromActive` to `toActive` - see `slideOffset`'s own note on why an
 * uninvolved slide's shortest side can flip between two active values.
 * Anything moving by more than one slide-width in a single step is either
 * such a flip, or a genuine multi-slide jump (e.g. the admin-field-focus
 * jump landing several slides away) - both read better snapped instantly
 * than animated sweeping across every slide in between.
 */
export function instantSlideIndices(
  fromActive: number,
  toActive: number,
  count: number,
): Set<number> {
  const result = new Set<number>()
  for (let index = 0; index < count; index++) {
    const before = slideOffset(index, fromActive, count)
    const after = slideOffset(index, toActive, count)
    if (Math.abs(after - before) > 1) result.add(index)
  }
  return result
}
