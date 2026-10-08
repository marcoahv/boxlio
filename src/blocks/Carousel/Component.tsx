'use client'

import Link from 'next/link'
import { useCallback, useEffect, useId, useState } from 'react'

import { Section, Container, Stack, Heading } from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import { useIsEditableField } from '@/utilities/EditableFieldContext'
import { useEditableField } from '@/utilities/useEditableField'
import { isBlockSyncEvent } from '@/utilities/blockSyncMessages'
import { getServerSideURL } from '@/utilities/getUrl'
import type { CarouselBlock, Media } from '@/payload-types'

import { instantSlideIndices, nextIndex, prevIndex, slideOffset } from './slideIndex'

/** Decorative - the accessible name lives on the button itself. */
function PrevIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m15 6-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function NextIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="m9 6 6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type SlideData = NonNullable<CarouselBlock['items']>[number]
type SlideTransition = NonNullable<CarouselBlock['transition']>
type SlideLink = NonNullable<SlideData['links']>[number]

/**
 * One slide's own button, mirroring Hero's `HeroLinkButton` - its own
 * component so `useEditableField` is called at each button's own top
 * level, per the Rules of Hooks. `fieldPath` carries the `items.<n>.`
 * prefix Hero itself never needs (a standalone Hero has no enclosing
 * array), otherwise identical.
 */
function CarouselSlideLinkButton({
  blockId,
  slideIndex,
  linkIndex,
  link,
}: {
  blockId?: string | null
  slideIndex: number
  linkIndex: number
  link: SlideLink
}) {
  const labelField = useEditableField({
    blockId,
    fieldPath: `items.${slideIndex}.links.${linkIndex}.label`,
    value: link.label,
  })

  return (
    <Link
      href={link.url}
      className={[
        'ui-btn',
        { outline: 'ui-btn-outline', ghost: 'ui-btn-ghost' }[link.variant ?? ''],
        link.color === 'secondary' ? 'ui-btn-secondary' : '',
      ]
        .filter(Boolean)
        .join(' ')}
      {...labelField.fieldProps}
    >
      {labelField.content}
    </Link>
  )
}

/**
 * One slide - every field Hero (`src/blocks/Hero/config.ts`/`Component.tsx`)
 * exposes on a single instance, ported here rather than imported: Hero's
 * own file stays untouched (zero risk of regressing a shipped, independent
 * block), at the cost of duplicating its layout logic - a deliberate,
 * flagged tradeoff given the size of this change, not an oversight. See
 * current-feature.md's Notes for the AI.
 *
 * Deviations from Hero's own DOM, both deliberate:
 *  - No separate inner `<Container>` for the text/media row - Carousel's
 *    own block-level `<Container width={width}>` (see the Carousel
 *    component below) already constrains the whole viewport once; adding
 *    Hero's own `ui-hero-container` (which reads a *different*, sitewide
 *    Hero-width token) here would fight it instead of composing with it.
 *    The row gets its own fixed padding instead, so text never touches the
 *    slide's edge regardless of Carousel's width setting.
 *  - No per-slide `<Section>` - this slide's own `role="group"` wrapper is
 *    already `position: absolute`, which is all `.ui-hero-bg`/
 *    `.ui-hero-overlay`'s own `position: absolute; inset: 0` need to
 *    resolve against correctly. The *visible* background/surface comes
 *    from the Carousel component's own outer `<Section>` instead - see its
 *    own note on why that one has to be the real `<Section>` (the header's
 *    transparency-contrast system only looks at the page's first-level
 *    Section, several DOM layers above this one).
 */
function CarouselSlide({
  blockId,
  item,
  index,
  total,
  isActive,
  offset,
  instant,
  transition,
}: {
  blockId?: string | null
  item: SlideData
  index: number
  total: number
  isActive: boolean
  offset: number
  instant: boolean
  transition: SlideTransition
}) {
  const {
    heading,
    subheading,
    image,
    mediaType,
    video,
    videoLoop,
    videoHideControls,
    layout,
    headerPosition,
    mediaFill,
    align,
    overlayCoverage,
    overlayColor,
    overlayOpacity,
    links,
  } = item

  const headingField = useEditableField({
    blockId,
    fieldPath: `items.${index}.heading`,
    value: heading,
  })
  const subheadingField = useEditableField({
    blockId,
    fieldPath: `items.${index}.subheading`,
    value: subheading ?? '',
    multiline: true,
  })

  const isBackgroundImage = layout === 'backgroundImage'
  const isSplit = layout === 'split'
  const hasVideo = isSplit && mediaType === 'video' && isDoc<Media>(video)
  const hasImage = isSplit && !isBackgroundImage && mediaType !== 'video' && isDoc<Media>(image)
  const hasBackgroundImage = isBackgroundImage && mediaType !== 'video' && isDoc<Media>(image)
  const hasBackgroundVideo = isBackgroundImage && mediaType === 'video' && isDoc<Media>(video)
  const hasBackgroundMedia = hasBackgroundImage || hasBackgroundVideo
  // headerPosition describes where the heading/text sits, so the media ends
  // up on the opposite side - same convention Hero itself uses.
  const isMediaLeft = headerPosition === 'right'
  const hasSideMedia = hasImage || hasVideo
  const mediaFillMode = hasSideMedia ? (mediaFill ?? 'contained') : 'contained'
  const mediaCover = mediaFillMode !== 'contained'
  const mediaRadius = mediaFillMode === 'fullBleed' ? 'none' : 'site'
  const mediaShadow = mediaFillMode === 'fullBleed' ? 'none' : 'site'
  const textAlign = align ?? 'left'
  const contentAlign = textAlign === 'center' ? 'center' : textAlign === 'right' ? 'end' : undefined
  const textAlignClass = textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : ''
  const overlayOverWholeImage = hasBackgroundMedia && overlayCoverage !== 'content'
  const overlayOverContentOnly = hasBackgroundMedia && overlayCoverage === 'content'
  const resolvedOverlayColor = overlayColor ?? 'dark'
  const resolvedOverlayOpacity = overlayOpacity ?? (hasBackgroundMedia ? 'medium' : 'none')
  const hasLinkableLinks = links?.some((link) => link.url) ?? false
  const overlayModifierClasses = [
    resolvedOverlayColor !== 'dark' ? `ui-hero-overlay--${resolvedOverlayColor}` : '',
    resolvedOverlayOpacity !== 'medium' ? `ui-hero-overlay-opacity--${resolvedOverlayOpacity}` : '',
  ]
    .filter(Boolean)
    .join(' ')
  const textContentClassName = ['flex-1', hasSideMedia && isMediaLeft ? 'atMedium:pl-8' : '']
    .filter(Boolean)
    .join(' ')
  // Hero computes an equivalent `needsDarkOverlayText` for its own
  // Section's `hasDarkOverlayText` prop - this slide has no Section of its
  // own (see the Component's own note), so the Carousel component
  // computes the same thing itself from whichever slide is active, for
  // its one shared outer Section instead.

  const textContent = (
    <Stack gap="md" className={textContentClassName} align={contentAlign}>
      <Heading level={2} className={textAlignClass || undefined} {...headingField.fieldProps}>
        {headingField.content}
      </Heading>
      {/* Widened with `isEditable`: without it, clearing the last
          character would unmount the node being typed into - see
          `useEditableField`'s own note. */}
      {(subheading || subheadingField.isEditable) && (
        <p
          className={['ui-paragraph max-w-[60ch] whitespace-pre-wrap', textAlignClass]
            .filter(Boolean)
            .join(' ')}
          {...subheadingField.fieldProps}
        >
          {subheadingField.content}
        </p>
      )}
      {hasLinkableLinks && (
        <Stack direction="row" gap="sm" wrap align="center" justify={contentAlign} className="mt-2">
          {links?.map((link, linkIndex) =>
            link.url ? (
              <CarouselSlideLinkButton
                key={link.id ?? linkIndex}
                blockId={blockId}
                slideIndex={index}
                linkIndex={linkIndex}
                link={link}
              />
            ) : null,
          )}
        </Stack>
      )}
    </Stack>
  )

  // Only the wrapper's own sizing/positioning class differs by placement
  // (in-row for Contained/Stretch vs. full-bleed-half for Full-bleed) - the
  // image/video itself is identical either way, so it's parameterized on
  // that one class rather than duplicated per placement - same as Hero.
  const renderMedia = (wrapperClassName: string) => {
    if (hasImage) {
      return mediaCover ? (
        <MediaImage
          image={image as Media}
          fill
          radius={mediaRadius}
          shadow={mediaShadow}
          className={wrapperClassName}
          priority
        />
      ) : (
        <MediaImage image={image as Media} size="fullSize" className={wrapperClassName} priority />
      )
    }
    if (hasVideo) {
      return (
        <div className={wrapperClassName}>
          <video
            src={(video as Media).url ?? undefined}
            loop={Boolean(videoLoop)}
            // Hidden controls means there's otherwise no way to start the
            // video, so that choice also autoplays it - muted, since
            // browsers block unmuted autoplay.
            controls={!videoHideControls}
            autoPlay={Boolean(videoHideControls)}
            muted={Boolean(videoHideControls)}
            playsInline
            className={[
              mediaCover ? 'ui-hero-bg ui-img-cover' : 'ui-img h-auto',
              mediaRadius === 'none' ? 'rounded-[var(--radius-none)]' : 'rounded-[var(--radius-image)]',
              mediaShadow === 'none' ? 'shadow-[var(--shadow-none)]' : 'shadow-[var(--shadow-image)]',
            ].join(' ')}
          />
        </div>
      )
    }
    return null
  }

  const rowMediaContent = renderMedia(
    mediaCover ? 'flex-1 relative aspect-video atMedium:aspect-auto' : 'flex-1',
  )

  // Full-bleed's media anchors directly to this slide's own box (the
  // nearest `position: absolute` ancestor - see the Component's own note),
  // not a separate Container - same idea as Hero's Section-level sibling,
  // just one layer shallower since there's no inner Container here to
  // escape from.
  const fullBleedPositionClassName = [
    'relative aspect-video',
    'atMedium:absolute atMedium:inset-y-0 atMedium:aspect-auto atMedium:w-1/2',
    isMediaLeft ? 'atMedium:left-0 atMedium:right-auto' : 'atMedium:right-0 atMedium:left-auto',
  ].join(' ')
  const hasFullBleedOverlay = mediaFillMode === 'fullBleed' && resolvedOverlayOpacity !== 'none'
  const fullBleedMediaContent =
    mediaFillMode === 'fullBleed' ? (
      <div className={fullBleedPositionClassName}>
        {renderMedia('absolute inset-0')}
        {hasFullBleedOverlay && (
          <div
            className={['ui-hero-overlay', overlayModifierClasses].filter(Boolean).join(' ')}
            aria-hidden
          />
        )}
      </div>
    ) : null

  return (
    <div
      role="group"
      aria-roledescription="slide"
      aria-label={`Slide ${index + 1} of ${total}`}
      // Taken out of the accessibility tree whenever this slide isn't the
      // active one, in both transitions - `visibility` (Fade) already does
      // this but Slide can't use it (see _carousel.css's own note), so
      // `aria-hidden` covers both uniformly.
      aria-hidden={!isActive}
      data-active={isActive ? 'true' : undefined}
      data-transition={transition}
      // `isolate`: without a stacking context of its own, this div's
      // z-index:auto wouldn't contain the overlay-content panel's z-index
      // below, which would then leak out and compete with the Previous/
      // Next buttons in the viewport's own stacking context instead -
      // see current-feature.md's own note on the bug this previously
      // caused.
      className={`ui-carousel-slide absolute inset-0 isolate${isActive ? '' : ' pointer-events-none'}`}
      style={
        {
          '--ui-carousel-offset': offset,
          transitionDuration: transition === 'slide' && instant ? '0s' : undefined,
        } as React.CSSProperties
      }
    >
      {hasBackgroundImage && (
        <MediaImage image={image as Media} fill radius="none" className="ui-hero-bg" priority />
      )}
      {hasBackgroundVideo && (
        <video
          src={(video as Media).url ?? undefined}
          autoPlay
          loop
          muted
          playsInline
          className="ui-hero-bg ui-img-cover"
        />
      )}
      {overlayOverWholeImage && (
        <div
          className={['ui-hero-overlay', overlayModifierClasses].filter(Boolean).join(' ')}
          aria-hidden
        />
      )}
      {fullBleedMediaContent}
      <div
        className={[
          'relative z-[2] flex h-full flex-col gap-10 p-8 atMedium:p-16',
          hasBackgroundMedia ? ['ui-hero-content', resolvedOverlayColor === 'light' ? 'ui-hero-content--on-light' : ''] : [],
          overlayOverContentOnly
            ? ['ui-hero-overlay-content', 'w-fit', overlayModifierClasses]
            : [],
          hasSideMedia && mediaFillMode !== 'fullBleed'
            ? [
                'atMedium:flex-row atMedium:gap-16',
                mediaFillMode === 'stretch' ? 'atMedium:items-stretch' : 'atMedium:items-center',
              ]
            : ['items-center', contentAlign === 'end' ? 'justify-end' : contentAlign === 'center' ? 'justify-center' : 'justify-center'],
          hasSideMedia && mediaFillMode !== 'fullBleed' && isMediaLeft ? ['atMedium:flex-row-reverse'] : [],
          mediaFillMode === 'fullBleed'
            ? [`atMedium:w-1/2`, isMediaLeft ? 'atMedium:ml-auto' : 'atMedium:mr-auto']
            : [],
        ]
          .flat()
          .filter(Boolean)
          .join(' ')}
      >
        {textContent}
        {mediaFillMode !== 'fullBleed' && rowMediaContent}
      </div>
    </div>
  )
}

/**
 * Image/content slider: one slide visible at a time, with Previous/Next
 * controls and `ArrowLeft`/`ArrowRight` keyboard navigation. Every slide is
 * now a full Hero's worth of content (heading, subheading, image or video,
 * buttons, and the same Text-only/Split/Media Background layout choices) -
 * see `CarouselSlide`'s own note on how that's ported without touching
 * Hero's own file. Every slide stays mounted and stacked at once,
 * transitioning via `data-active`/`data-transition` (`_carousel.css`) - so
 * an editable field's ref never has to remount as the active slide
 * changes.
 *
 * Renders as a real carousel in Live Preview too, not stacked into a
 * visible column - an earlier version stacked every slide that way
 * whenever inline editing was active (the page-wide flag is true for the
 * whole time Live Preview is open, not just while a field has focus - see
 * the `isEditing` note below), which made the carousel look permanently
 * broken to an editor who was just looking at the page. Reachability is
 * solved the other way instead: focusing any of a slide's fields in the
 * admin sidebar sends `admin-field-focus` (`block-hover-sync/
 * Component.tsx`), which this component listens for directly to jump the
 * viewport to that slide - see the `message` effect below - rather than
 * relying on `useBlockSyncListener`'s generic scroll-to-element, which
 * can't bring a non-active slide into view by itself.
 */
export function Carousel(props: CarouselBlock) {
  const { id, items, autoplay, autoplayInterval, width, transition } = props
  const resolvedTransition: SlideTransition = transition === 'slide' ? 'slide' : 'fade'
  const baseId = useId()
  // `instant` holds the indices whose Slide-transition move should render
  // without animating this time - computed atomically alongside `index`
  // inside `moveActive`'s updater, which has both the outgoing and
  // incoming index on hand with no ref needed (reading a ref during
  // render is disallowed by this project's lint rules). See
  // `instantSlideIndices`'s own note for why a jump needs this at all.
  const [active, setActive] = useState<{ index: number; instant: ReadonlySet<number> }>({
    index: 0,
    instant: new Set(),
  })
  const [isPaused, setIsPaused] = useState(false)
  // Whole-page flag (see EditableFieldContext): true for the entire time
  // Live Preview is open, not just while a field has focus. Only drives the
  // admin-field-focus listener below - autoplay deliberately does NOT key
  // off it (see that effect's own note); the viewport's own rendering
  // never did either.
  const isEditing = useIsEditableField() && Boolean(id)
  // Computed ahead of the early-return below so the hooks that depend on it
  // (useCallback/useEffect) are never called conditionally, per the Rules of
  // Hooks.
  const count = items?.length ?? 0

  // Every way the active slide changes (Previous/Next, autoplay, the
  // admin-field-focus jump) goes through this one updater, so `instant`
  // can never be computed against a stale or mismatched `index`.
  const moveActive = useCallback(
    (resolveNext: (current: number) => number) => {
      setActive((current) => {
        const nextIndexValue = resolveNext(current.index)
        if (nextIndexValue === current.index) return current
        return { index: nextIndexValue, instant: instantSlideIndices(current.index, nextIndexValue, count) }
      })
    },
    [count],
  )

  const handlePrev = useCallback(() => {
    moveActive((current) => prevIndex(current, count))
  }, [moveActive, count])

  const handleNext = useCallback(() => {
    moveActive((current) => nextIndex(current, count))
  }, [moveActive, count])

  // Deliberately NOT gated on `isEditing` - that flag is true for the whole
  // time Live Preview is merely open, which previously made autoplay look
  // broken there the same way the stacking override once broke the
  // viewport (see the Component's own note). Pausing specifically while
  // THIS block's own field is being edited would need an admin-sidebar
  // blur signal this codebase doesn't send (`blockSyncMessages.ts` has no
  // counterpart to `admin-field-focus`), so this accepts the minor
  // rough edge of autoplay advancing in the background while an editor
  // might be mid-edit elsewhere, rather than risking a pause that can
  // never clear.
  useEffect(() => {
    if (!autoplay || isPaused || count <= 1) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const intervalId = window.setInterval(() => {
      moveActive((current) => nextIndex(current, count))
    }, (autoplayInterval ?? 5) * 1000)

    return () => window.clearInterval(intervalId)
  }, [autoplay, autoplayInterval, count, isPaused, moveActive])

  // Jumps the viewport to whichever slide's field just received focus in
  // the admin sidebar - the reachability fix this block actually needs.
  // Matches any field under `items.<n>.` (heading, subheading, any link
  // label - not just one specific field name), since every slide now
  // carries many editable fields, not just a caption.
  // `useBlockSyncListener`'s own `admin-field-focus` handling only scrolls
  // to an element already in view; it can't reveal a non-active slide, so
  // this block listens for the same message directly instead.
  useEffect(() => {
    if (!isEditing) return
    const serverURL = getServerSideURL()

    const onMessage = (event: MessageEvent) => {
      if (!isBlockSyncEvent(event, serverURL)) return
      const message = event.data
      if (message.type !== 'admin-field-focus' || message.blockId !== id) return

      const match = /^items\.(\d+)\./.exec(message.fieldPath)
      if (!match) return
      const index = Number(match[1])
      if (index >= 0 && index < count) moveActive(() => index)
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [isEditing, id, count, moveActive])

  if (!items?.length) return null

  // Nothing to navigate to with a single slide (a transient unsaved
  // live-preview draft - `minRows: 2` only gates what can be saved).
  const canNavigate = count > 1
  const activeItem = items[active.index]

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!canNavigate) return
    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      handlePrev()
    } else if (event.key === 'ArrowRight') {
      event.preventDefault()
      handleNext()
    }
  }

  // Mirrors exactly what a standalone Hero computes for itself from these
  // same fields (see Hero/Component.tsx) - recomputed from whichever slide
  // is currently active, since this outer Section is shared by all of
  // them. This is also the one element in the whole tree that's actually
  // the page's first-level Section (if Carousel is the first block) - see
  // CarouselSlide's own note on why the background/surface itself has to
  // live here, not on a per-slide element several layers deeper.
  const activeIsBackgroundImage = activeItem?.layout === 'backgroundImage'
  const activeHasBackgroundMedia =
    activeIsBackgroundImage && (isDoc<Media>(activeItem?.image) || isDoc<Media>(activeItem?.video))
  const activeMediaFillMode = activeItem?.mediaFill ?? 'contained'
  const activeIsMediaLeft = activeItem?.headerPosition === 'right'
  const activeSplitMediaSide =
    activeItem?.layout === 'split' && activeMediaFillMode === 'fullBleed'
      ? activeIsMediaLeft
        ? 'left'
        : 'right'
      : undefined
  const activeNeedsDarkOverlayText =
    (activeItem?.overlayColor ?? 'dark') === 'light' &&
    activeHasBackgroundMedia &&
    (activeItem?.overlayCoverage ?? 'full') !== 'content'

  // The region that actually holds the slides, nav controls, and live
  // region - identical markup either way, always inside Container so
  // every layout respects `width` instead of being locked to full-bleed -
  // 'Full' width already strips Container's own padding, see
  // ui-carousel-container's own rule, so that's still the edge-to-edge
  // look for Media Background slides when that's what's wanted.
  const viewport = (
    <div
      role="region"
      aria-roledescription="carousel"
      onKeyDown={handleKeyDown}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className="relative aspect-video overflow-hidden"
    >
      {items.map((item, index) => (
        <CarouselSlide
          key={item.id ?? index}
          blockId={id}
          item={item}
          index={index}
          total={count}
          isActive={index === active.index}
          offset={slideOffset(index, active.index, count)}
          instant={active.instant.has(index)}
          transition={resolvedTransition}
        />
      ))}

      {canNavigate && (
        <>
          <button
            type="button"
            onClick={handlePrev}
            // Stops a mouse click from leaving this button focused -
            // without it, the `onFocus` pause above never gets an
            // `onBlur` to clear it once the pointer moves away, and
            // autoplay stays paused for good. Keyboard activation
            // (Tab + Enter/Space) never fires `mousedown`, so this
            // doesn't touch keyboard accessibility.
            onMouseDown={(event) => event.preventDefault()}
            aria-label="Previous slide"
            aria-controls={`${baseId}-live`}
            className="ui-carousel-nav absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <PrevIcon />
          </button>
          <button
            type="button"
            onClick={handleNext}
            onMouseDown={(event) => event.preventDefault()}
            aria-label="Next slide"
            aria-controls={`${baseId}-live`}
            className="ui-carousel-nav absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full"
          >
            <NextIcon />
          </button>

          <div id={`${baseId}-live`} role="status" aria-live="polite" className="sr-only">
            {`Slide ${active.index + 1} of ${count}`}
          </div>
        </>
      )}
    </div>
  )

  return (
    <Section
      blockId={id}
      surface={activeItem?.surface}
      className="ui-hero-section"
      hasBackgroundImage={activeHasBackgroundMedia}
      splitMediaSide={activeSplitMediaSide}
      hasDarkOverlayText={activeNeedsDarkOverlayText}
    >
      <Container width={width} className="ui-carousel-container">
        {viewport}
      </Container>
    </Section>
  )
}
