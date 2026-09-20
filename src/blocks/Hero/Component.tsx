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
    layout,
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
  const hasImage =
    layout !== 'textOnly' && !isBackgroundImage && isDoc<Media>(image)
  const hasBackgroundImage = isBackgroundImage && isDoc<Media>(image)
  const overlayOverWholeImage =
    hasBackgroundImage && overlayCoverage !== 'content'
  const overlayOverContentOnly =
    hasBackgroundImage && overlayCoverage === 'content'
  const resolvedOverlayColor = overlayColor ?? 'dark'
  const resolvedOverlayOpacity = overlayOpacity ?? 'medium'
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

  return (
    <Section
      blockId={id}
      surface={surface}
      className="ui-hero-section"
      hasBackgroundImage={hasBackgroundImage}
      hasDarkOverlayText={
        overlayOverWholeImage && resolvedOverlayColor === 'light'
      }
    >
      {hasBackgroundImage && (
        <>
          <MediaImage
            image={image as Media}
            fill
            radius="none"
            className="ui-hero-bg"
            priority
          />
          {overlayOverWholeImage && (
            <div
              className={['ui-hero-overlay', overlayModifierClasses]
                .filter(Boolean)
                .join(' ')}
              aria-hidden
            />
          )}
        </>
      )}
      <Container
        className={[
          'ui-hero-container',
          hasBackgroundImage
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
            hasImage
              ? 'atMedium:flex-row atMedium:items-center atMedium:gap-16'
              : '',
            hasImage && layout === 'imageLeft'
              ? 'atMedium:flex-row-reverse'
              : '',
          ]
            .filter(Boolean)
            .join(' ')}
        >
          <Stack gap="md" className="flex-1">
            <Heading level={1} {...headingField.fieldProps}>
              {headingField.content}
            </Heading>
            {(subheading || subheadingField.isEditable) && (
              <p className="ui-paragraph max-w-[60ch] whitespace-pre-wrap" {...subheadingField.fieldProps}>
                {subheadingField.content}
              </p>
            )}

            {linkableLinks.length > 0 && (
              <Stack
                direction="row"
                gap="sm"
                wrap
                align="center"
                className="mt-2"
              >
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

          {hasImage && (
            <MediaImage
              image={image as Media}
              size="fullSize"
              className="flex-1"
              priority
            />
          )}
        </div>
      </Container>
    </Section>
  )
}
