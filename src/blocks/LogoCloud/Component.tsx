import { Section, Container, Stack, Heading } from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import { useEditableField } from '@/utilities/useEditableField'
import type { LogoCloudBlock, Media } from '@/payload-types'

/** A wrapping row of partner/client logos. */
export function LogoCloud(props: LogoCloudBlock) {
  const { id, surface, heading, items } = props
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading ?? '' })

  if (!items?.length) return null

  return (
    <Section blockId={id} surface={surface}>
      <Container className="ui-section-container">
        <Stack gap="lg">
          {/* Widened with `isEditable`: without it, clearing the last
              character of the heading would unmount the node being typed
              into. See `useEditableField`'s own note. */}
          {(heading || headingField.isEditable) && (
            <Heading level={2} className="max-w-[70ch]" {...headingField.fieldProps}>
              {headingField.content}
            </Heading>
          )}

          <Stack direction="row" gap="lg" wrap align="center">
            {items.map(
              (item, index) =>
                isDoc<Media>(item.logo) && (
                  <MediaImage key={item.id ?? index} image={item.logo as Media} size="thumbnail" />
                ),
            )}
          </Stack>
        </Stack>
      </Container>
    </Section>
  )
}
