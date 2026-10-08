import React from 'react'
import { act, cleanup, fireEvent, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { Carousel } from '@/blocks/Carousel/Component'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'
import type { CarouselBlock } from '@/payload-types'

// `@testing-library/react`'s own auto-cleanup only registers itself when it
// detects a global `afterEach` - this project's vitest config doesn't set
// `test.globals: true`, so without this, the previous test's render would
// leak into the next one's `document.body`.
afterEach(cleanup)

// jsdom doesn't implement `matchMedia` at all (confirmed empty here; the
// same gap `ThemeToggle.tsx`'s own unit-untested calls hit), so the
// autoplay effect's reduced-motion check throws without this stub. Always
// reports "not reduced" - a dedicated reduced-motion test would need its
// own `matches: true` stub, which isn't covered here.
if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  })) as any
}

// Matches `getServerSideURL()`'s own fallback - no NEXT_PUBLIC_SERVER_URL is
// set in this project's .env, same assumption `useIsInsideLivePreview.int.spec.ts` makes.
const SERVER_URL = 'http://localhost:3000'

// String ids, not populated Media docs - `isDoc` only needs to decide
// whether a slide's image/video is an object to render, which is
// orthogonal to these tests. Every slide is now a full Hero's worth of
// fields (see Component.tsx's own note) - `layout: 'split'` plus an image
// keeps these fixtures close to the block's defaults.
const items: CarouselBlock['items'] = [
  { id: 's1', heading: 'First heading', layout: 'split', image: '000000000000000000000001' },
  { id: 's2', heading: 'Second heading', layout: 'split', image: '000000000000000000000002' },
  { id: 's3', heading: 'Third heading', layout: 'split', image: '000000000000000000000003' },
]

const props: CarouselBlock = {
  id: 'carousel-1',
  blockType: 'carousel',
  items,
}

// Every slide stays mounted and stacked at once (see the Component's own
// note on why), so a slide's text is always findable in the DOM - the
// actual contract is whether its slide wrapper carries `data-active`
// (crossfaded/pushed in via `_carousel.css`), which `getByText`'s default
// matcher doesn't check.
function isSlideActive(text: HTMLElement): boolean {
  const slide = text.closest('[role="group"]')
  return slide?.getAttribute('data-active') === 'true'
}

function activeSlideCount(container: HTMLElement): number {
  const slides = container.querySelectorAll('[role="group"]')
  return Array.from(slides).filter((slide) => slide.getAttribute('data-active') === 'true').length
}

function postAdminFieldFocus(blockId: string, fieldPath: string) {
  act(() => {
    window.dispatchEvent(
      new MessageEvent('message', {
        data: { type: 'admin-field-focus', blockId, fieldPath },
        origin: SERVER_URL,
      }),
    )
  })
}

describe('Carousel', () => {
  it('shows only the active slide, whether or not inline editing is active', () => {
    for (const isEditing of [false, true]) {
      const { container, getByText, unmount } = render(
        React.createElement(
          EditableFieldProvider,
          { value: isEditing },
          React.createElement(Carousel, props),
        ),
      )

      expect(activeSlideCount(container)).toBe(1)
      expect(isSlideActive(getByText('First heading'))).toBe(true)
      expect(isSlideActive(getByText('Second heading'))).toBe(false)

      unmount()
    }
  })

  it('jumps to the slide whose field received admin focus while editing', () => {
    const { container, getByText } = render(
      React.createElement(EditableFieldProvider, { value: true }, React.createElement(Carousel, props)),
    )

    postAdminFieldFocus('carousel-1', 'items.2.heading')

    expect(activeSlideCount(container)).toBe(1)
    expect(isSlideActive(getByText('Third heading'))).toBe(true)
    expect(isSlideActive(getByText('First heading'))).toBe(false)
  })

  it('jumps on a focus message for ANY of a slide\'s fields, not just one specific name', () => {
    // Every slide now carries many editable fields (heading, subheading,
    // button labels, ...) - the admin-field-focus match broadened from one
    // literal field name to `items.<n>.` generically to cover all of them.
    const { getByText } = render(
      React.createElement(EditableFieldProvider, { value: true }, React.createElement(Carousel, props)),
    )

    postAdminFieldFocus('carousel-1', 'items.1.links.0.label')

    expect(isSlideActive(getByText('Second heading'))).toBe(true)
  })

  it('ignores an admin-field-focus message addressed to a different block', () => {
    const { getByText } = render(
      React.createElement(EditableFieldProvider, { value: true }, React.createElement(Carousel, props)),
    )

    postAdminFieldFocus('some-other-block', 'items.2.heading')

    expect(isSlideActive(getByText('First heading'))).toBe(true)
  })

  it('never jumps to a slide while editing is not active', () => {
    const { getByText } = render(
      React.createElement(
        EditableFieldProvider,
        { value: false },
        React.createElement(Carousel, props),
      ),
    )

    postAdminFieldFocus('carousel-1', 'items.2.heading')

    expect(isSlideActive(getByText('First heading'))).toBe(true)
  })

  it('keeps every non-active slide out of the way of pointer events during the crossfade', () => {
    // Every slide now stacks in the same box at once (see Component.tsx's
    // own note on the Background Image overlay bug this guards against) -
    // the non-active one(s) must not intercept clicks meant for the active
    // slide or the Previous/Next buttons, including while still fading out.
    const { container } = render(React.createElement(Carousel, props))

    const slides = Array.from(container.querySelectorAll('[role="group"]'))
    const active = slides.find((slide) => slide.getAttribute('data-active') === 'true')
    const inactive = slides.filter((slide) => slide !== active)

    expect(inactive).toHaveLength(2)
    for (const slide of inactive) {
      expect(slide.className).toContain('pointer-events-none')
    }
    expect(active?.className).not.toContain('pointer-events-none')
  })
})

describe('Carousel slide content: every Hero field', () => {
  it('renders the optional subheading, widened with isEditable the same way every sibling block does', () => {
    const withSubheading: CarouselBlock['items'] = [
      { ...items[0], subheading: 'A supporting line' },
      items[1],
      items[2],
    ]
    const { getByText } = render(React.createElement(Carousel, { ...props, items: withSubheading }))

    expect(getByText('A supporting line')).toBeTruthy()
  })

  it('renders a slide\'s buttons, each wired through its own editable field path', () => {
    const withLinks: CarouselBlock['items'] = [
      {
        ...items[0],
        links: [{ id: 'l1', label: 'Learn more', url: '/learn-more', variant: 'solid', color: 'primary' }],
      },
      items[1],
      items[2],
    ]
    const { getByText } = render(React.createElement(Carousel, { ...props, items: withLinks }))

    const button = getByText('Learn more')
    expect(button.closest('a')).toHaveProperty('href', expect.stringContaining('/learn-more'))
  })

  it('skips a button with no url yet (live preview merging an unsaved row)', () => {
    const withEmptyLink: CarouselBlock['items'] = [
      { ...items[0], links: [{ id: 'l1', label: 'Draft button', url: '' }] },
      items[1],
      items[2],
    ]
    const { queryByText } = render(React.createElement(Carousel, { ...props, items: withEmptyLink }))

    expect(queryByText('Draft button')).toBeNull()
  })

  it('Text-only layout renders no image even when one is set', () => {
    const textOnly: CarouselBlock['items'] = [
      { ...items[0], layout: 'textOnly' },
      items[1],
      items[2],
    ]
    const { container } = render(React.createElement(Carousel, { ...props, items: textOnly }))

    expect(container.querySelector('img')).toBeNull()
  })

  it('Split layout with mediaType video renders a video element instead of an image', () => {
    // `isDoc` (and so every media-rendering branch) only treats a
    // *populated* doc as present - a bare string id (every other fixture
    // in this file) correctly renders nothing, which is fine for tests
    // that don't care about the media itself, but this one needs a
    // populated-shaped fake to actually exercise the video branch.
    const fakeVideo = { id: 'v1', url: '/fake.mp4', alt: '' } as unknown as NonNullable<
      CarouselBlock['items'][number]['video']
    >
    const video: CarouselBlock['items'] = [
      { ...items[0], mediaType: 'video', image: undefined, video: fakeVideo },
      items[1],
      items[2],
    ]
    const { container } = render(React.createElement(Carousel, { ...props, items: video }))

    expect(container.querySelector('video')).toBeTruthy()
    expect(container.querySelector('img')).toBeNull()
  })

  it('Media Background layout renders the image full-bleed within the active slide', () => {
    const fakeImage = { id: 'img1', url: '/fake.jpg', alt: '' } as unknown as NonNullable<
      CarouselBlock['items'][number]['image']
    >
    const backgroundImage: CarouselBlock['items'] = [
      { ...items[0], layout: 'backgroundImage', image: fakeImage },
      items[1],
      items[2],
    ]
    const { getByText } = render(React.createElement(Carousel, { ...props, items: backgroundImage }))

    const slide = getByText('First heading').closest('[role="group"]') as HTMLElement
    expect(slide.querySelector('.ui-hero-bg')).toBeTruthy()
  })
})

describe('Carousel transition: Slide', () => {
  function offsetOf(slide: Element): string {
    return (slide as HTMLElement).style.getPropertyValue('--ui-carousel-offset')
  }

  it('defaults to Fade when unset', () => {
    const { container } = render(React.createElement(Carousel, props))
    const slide = container.querySelector('[role="group"]') as HTMLElement
    expect(slide.getAttribute('data-transition')).toBe('fade')
  })

  it('sets each slide\'s offset from the active one, and hides non-active slides from the accessibility tree', () => {
    const { container } = render(React.createElement(Carousel, { ...props, transition: 'slide' }))

    const slides = Array.from(container.querySelectorAll('[role="group"]'))
    expect(slides.map((slide) => slide.getAttribute('data-transition'))).toEqual(['slide', 'slide', 'slide'])
    // activeIndex starts at 0: slide 0 is active (offset 0), slide 1 is one
    // ahead (+1), slide 2 is one behind the short way around (-1) - see
    // slideOffset's own tests for why that's -1 and not +2.
    expect(slides.map(offsetOf)).toEqual(['0', '1', '-1'])
    expect(slides[0].getAttribute('aria-hidden')).toBe('false')
    expect(slides[1].getAttribute('aria-hidden')).toBe('true')
    expect(slides[2].getAttribute('aria-hidden')).toBe('true')
  })

  it('recomputes every offset after Next advances the active slide', () => {
    const { container, getByLabelText } = render(
      React.createElement(Carousel, { ...props, transition: 'slide' }),
    )

    fireEvent.click(getByLabelText('Next slide'))

    const slides = Array.from(container.querySelectorAll('[role="group"]'))
    expect(slides.map(offsetOf)).toEqual(['-1', '0', '1'])
    expect(slides[1].getAttribute('data-active')).toBe('true')
  })

  it('snaps the one uninvolved slide instantly instead of animating its sign flip', () => {
    // Regression test for the reported bug: with 3 slides, going from the
    // 2nd to the 3rd (index 1 -> 2) is a normal adjacent step for those
    // two, but slide 0's shortest-path offset flips from -1 to +1 - see
    // `instantSlideIndices`'s own tests. Without the fix, that flip
    // animates like every other move and visibly sweeps slide 0 across
    // the screen even though it's not part of this transition at all.
    const { container, getByLabelText } = render(
      React.createElement(Carousel, { ...props, transition: 'slide' }),
    )

    fireEvent.click(getByLabelText('Next slide')) // index 0 -> 1
    fireEvent.click(getByLabelText('Next slide')) // index 1 -> 2

    const slides = Array.from(container.querySelectorAll('[role="group"]')) as HTMLElement[]
    expect(slides.map(offsetOf)).toEqual(['1', '-1', '0'])
    expect(slides[0].style.transitionDuration).toBe('0s')
    expect(slides[1].style.transitionDuration).toBe('')
    expect(slides[2].style.transitionDuration).toBe('')
  })
})

describe('Carousel autoplay', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('advances on its own regardless of whether Live Preview is open', () => {
    // Regression test for the bug this was fixed from: autoplay used to be
    // gated on `isEditing`, which is true for the whole time Live Preview
    // is open (not just while a field has focus) - so it silently never
    // ran there at all.
    vi.useFakeTimers()
    const { getByText } = render(
      React.createElement(
        EditableFieldProvider,
        { value: true },
        React.createElement(Carousel, { ...props, autoplay: true, autoplayInterval: 3 }),
      ),
    )

    expect(isSlideActive(getByText('First heading'))).toBe(true)

    act(() => {
      vi.advanceTimersByTime(3000)
    })

    expect(isSlideActive(getByText('Second heading'))).toBe(true)
  })

  it('pauses while hovered and resumes once the pointer leaves', () => {
    vi.useFakeTimers()
    const { container, getByText } = render(
      React.createElement(Carousel, { ...props, autoplay: true, autoplayInterval: 3 }),
    )
    const region = container.querySelector('[role="region"]') as HTMLElement

    fireEvent.mouseEnter(region)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    expect(isSlideActive(getByText('First heading'))).toBe(true)

    fireEvent.mouseLeave(region)
    act(() => {
      vi.advanceTimersByTime(3000)
    })
    expect(isSlideActive(getByText('Second heading'))).toBe(true)
  })
})
