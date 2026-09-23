import Link from 'next/link'
import {
  Section,
  Container,
  Stack,
  Heading,
} from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import { useEditableField } from '@/utilities/useEditableField'
import type { HeroBlock, Media } from '@/payload-types'

/**
 * Reference implementation for a block.
 *
 * The shape every block follows: read appearance off the block data, hand it
 * to <Section>/<Container>, and compose primitives inside. No colors, no
 * breakpoints, no padding decisions live here — those belong to the token
 * system, which is why a palette change re-brands this block for free.
 */
export function Hero(props: HeroBlock) {
  const {
    id,
    surface,
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
  } = props
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading })
  const subheadingField = useEditableField({
    blockId: id,
    fieldPath: 'subheading',
    value: subheading ?? '',
    multiline: true,
  })
  const isBackgroundImage = layout === 'backgroundImage'
  // Legacy documents saved before Split/Media Background were consolidated
  // still have layout: 'imageRight' | 'imageLeft' in Mongo - there's no
  // migration step in this project, so keep rendering them correctly.
  const legacyLayout = layout as string
  const isLegacySplit =
    legacyLayout === 'imageRight' || legacyLayout === 'imageLeft'
  const isSplit = layout === 'split' || isLegacySplit
  // Legacy Split docs predate `mediaType` (undefined), so they fall through
  // to the image path unaffected - only an explicit 'video' choice renders one.
  const hasVideo = isSplit && mediaType === 'video' && isDoc<Media>(video)
  const hasImage =
    isSplit && !isBackgroundImage && mediaType !== 'video' && isDoc<Media>(image)
  const hasBackgroundImage =
    isBackgroundImage && mediaType !== 'video' && isDoc<Media>(image)
  const hasBackgroundVideo =
    isBackgroundImage && mediaType === 'video' && isDoc<Media>(video)
  // Section's `hasBackgroundImage` prop really means "full-bleed media
  // backdrop behind this section's text" (see its own comment) - a video
  // backdrop needs the same header-contrast handling as an image one.
  const hasBackgroundMedia = hasBackgroundImage || hasBackgroundVideo
  // headerPosition describes where the heading/text sits, so the media (image
  // or video) ends up on the opposite side: header on the right flips it left.
  const isMediaLeft =
    headerPosition === 'right' || legacyLayout === 'imageLeft'
  const hasSideMedia = hasImage || hasVideo
  const mediaFillMode = hasSideMedia ? (mediaFill ?? 'contained') : 'contained'
  // Stretch and Full-bleed both crop the media with object-fit: cover instead
  // of showing it at its own intrinsic aspect ratio; Full-bleed additionally
  // drops the rounded corners/shadow since it reaches the section's true edge.
  const mediaCover = mediaFillMode !== 'contained'
  const mediaRadius = mediaFillMode === 'fullBleed' ? 'none' : 'site'
  const mediaShadow = mediaFillMode === 'fullBleed' ? 'none' : 'site'
  // Only the Text-only layout offers alignment - Split/Media Background keep
  // their existing stretch/left behavior regardless of a stale `align` value.
  const textAlign = layout === 'textOnly' ? (align ?? 'left') : 'left'
  const contentAlign =
    textAlign === 'center' ? 'center' : textAlign === 'right' ? 'end' : undefined
  const textAlignClass =
    textAlign === 'center' ? 'text-center' : textAlign === 'right' ? 'text-right' : ''
  const overlayOverWholeImage =
    hasBackgroundMedia && overlayCoverage !== 'content'
  const overlayOverContentOnly =
    hasBackgroundMedia && overlayCoverage === 'content'
  const resolvedOverlayColor = overlayColor ?? 'dark'
  // Media Background's overlay is a legibility requirement (text sits on top
  // of the photo), so it's on by default. Split's is purely decorative (its
  // media is its own half, never under the text) - defaulting it on too
  // would tint every already-published Full-bleed hero the moment this
  // field's condition made it apply to Split, with no value ever saved.
  const resolvedOverlayOpacity =
    overlayOpacity ?? (hasBackgroundMedia ? 'medium' : 'none')
  // Live preview merges unsaved form state instantly, so a Buttons row just
  // added (before its required label/url are filled in) would otherwise
  // render `<Link href={undefined}>` for a moment and warn - skip it until
  // it has a real destination, which also means two still-blank rows can
  // never collide on the same fallback key.
  const linkableLinks = links?.filter((link) => link.url) ?? []
  const overlayModifierClasses = [
    resolvedOverlayColor !== 'dark'
      ? `ui-hero-overlay--${resolvedOverlayColor}`
      : '',
    resolvedOverlayOpacity !== 'medium'
      ? `ui-hero-overlay-opacity--${resolvedOverlayOpacity}`
      : '',
  ]
    .filter(Boolean)
    .join(' ')

  // Text on the right sits with media pressed against its left edge (the row
  // gap alone reads a bit tight there) - extra breathing room only on that
  // side, only once there's actually media to sit next to, and only at
  // atMedium+ where the two are side by side at all.
  const textContentClassName = [
    'flex-1',
    hasSideMedia && isMediaLeft ? 'atMedium:pl-8' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const textContent = (
    <Stack gap="md" className={textContentClassName} align={contentAlign}>
      <Heading level={1} className={textAlignClass || undefined} {...headingField.fieldProps}>
        {headingField.content}
      </Heading>
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

      {linkableLinks.length > 0 && (
        <Stack direction="row" gap="sm" wrap align="center" justify={contentAlign} className="mt-2">
          {linkableLinks.map((link) => (
            <Link
              key={link.id ?? link.url}
              href={link.url}
              className={[
                'ui-btn',
                { outline: 'ui-btn-outline', ghost: 'ui-btn-ghost' }[link.variant ?? ''],
                link.color === 'secondary' ? 'ui-btn-secondary' : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {link.label}
            </Link>
          ))}
        </Stack>
      )}
    </Stack>
  )

  // Only the wrapper's own sizing/positioning class differs by placement
  // (in-row for Contained/Stretch vs. Section-level absolute for Full-bleed,
  // see below) - the image/video itself is identical either way, so it's
  // parameterized on that one class rather than duplicated per placement.
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

  // `aspect-video atMedium:aspect-auto` only matters for Stretch: object-fit:
  // cover has no intrinsic height, so without it the media would collapse to
  // 0 height stacked in the row's mobile column (Contained's own intrinsic
  // aspect ratio never needs this).
  const rowMediaContent = renderMedia(
    mediaCover ? 'flex-1 relative aspect-video atMedium:aspect-auto' : 'flex-1',
  )

  // Full-bleed's media is a Section-level sibling (see below, next to
  // hasBackgroundImage/hasBackgroundVideo), not part of this row at all.
  // Both sides of `inset-x` are set explicitly (not just the occupied side)
  // because this box also hosts the overlay below, which carries
  // `.ui-hero-overlay` - its own `inset: 0` would otherwise leave `left: 0`
  // active underneath an added `right-0` - with left, right, and width all
  // set, the box anchors to `left` regardless, landing the overlay (and
  // therefore the whole box) on the text side instead of the media's.
  //
  // Below `atMedium` this box is `position: relative`, not `absolute` (there
  // are only two Split panels to stack on mobile, not four) - so the media
  // and overlay are nested INSIDE this one box, each filling it via their
  // own `absolute inset-0`, rather than being separate Section-level
  // siblings that each independently try to reuse this class. Two siblings
  // both resolving to `relative` (not `absolute`) below `atMedium` would
  // render as two separate stacked blocks - the media, then the overlay as
  // its own solid-color block underneath it - instead of one overlapping
  // the other at every width, which is exactly the "video/image dimensions
  // are wrong on mobile" bug this fixes.
  const fullBleedPositionClassName = [
    'relative aspect-video',
    'atMedium:absolute atMedium:inset-y-0 atMedium:aspect-auto atMedium:w-1/2',
    isMediaLeft ? 'atMedium:left-0 atMedium:right-auto' : 'atMedium:right-0 atMedium:left-auto',
  ].join(' ')
  const hasFullBleedOverlay =
    mediaFillMode === 'fullBleed' && resolvedOverlayOpacity !== 'none'
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
  // The header is always logo-left / controls-right (HeaderClient.tsx), so
  // it only needs to know WHICH half its own floating bar shares with the
  // media - the same header-contrast treatment as Media Background, just
  // scoped to that half instead of the whole bar (see _header.css's
  // data-split-media-side rules). The opposite half keeps adopting the
  // section's normal Surface color, since it's really floating over the
  // text side.
  const splitMediaSide =
    mediaFillMode === 'fullBleed' && hasSideMedia
      ? isMediaLeft
        ? 'left'
        : 'right'
      : undefined
  const needsDarkOverlayText =
    resolvedOverlayColor === 'light' && (overlayOverWholeImage || hasFullBleedOverlay)

  return (
    <Section
      blockId={id}
      surface={surface}
      className="ui-hero-section"
      hasBackgroundImage={hasBackgroundMedia}
      splitMediaSide={splitMediaSide}
      hasDarkOverlayText={needsDarkOverlayText}
    >
      {hasBackgroundImage && (
        <MediaImage
          image={image as Media}
          fill
          radius="none"
          className="ui-hero-bg"
          priority
        />
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
          className={['ui-hero-overlay', overlayModifierClasses]
            .filter(Boolean)
            .join(' ')}
          aria-hidden
        />
      )}
      {fullBleedMediaContent}
      <Container
        className={[
          'ui-hero-container',
          hasBackgroundMedia
            ? [
                'ui-hero-content',
                resolvedOverlayColor === 'light' ? 'ui-hero-content--on-light' : '',
              ]
                .filter(Boolean)
                .join(' ')
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <div
          className={[
            'flex flex-col gap-10',
            overlayOverContentOnly
              ? ['ui-hero-overlay-content', 'w-fit', overlayModifierClasses]
                  .filter(Boolean)
                  .join(' ')
              : '',
            hasSideMedia && mediaFillMode !== 'fullBleed'
              ? `atMedium:flex-row atMedium:gap-16 ${
                  mediaFillMode === 'stretch' ? 'atMedium:items-stretch' : 'atMedium:items-center'
                }`
              : '',
            hasSideMedia && mediaFillMode !== 'fullBleed' && isMediaLeft
              ? 'atMedium:flex-row-reverse'
              : '',
            // Full-bleed's media is absolutely positioned against Section
            // (fullBleedMediaContent above), not part of this row - the row
            // just holds the text, sized to its own half and pushed to
            // whichever side the media doesn't occupy.
            mediaFillMode === 'fullBleed'
              ? `atMedium:w-1/2 ${isMediaLeft ? 'atMedium:ml-auto' : 'atMedium:mr-auto'}`
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          {textContent}
          {mediaFillMode !== 'fullBleed' && rowMediaContent}
        </div>
      </Container>
    </Section>
  )
}
