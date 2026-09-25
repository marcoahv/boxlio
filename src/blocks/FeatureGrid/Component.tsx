import { Section, Container, Stack, Heading } from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import { useEditableField } from '@/utilities/useEditableField'
import type { FeatureGridBlock, Media } from '@/payload-types'

// Literal class strings — Tailwind's scanner cannot resolve interpolation.
const COLUMNS = {
  '2': 'atMedium:grid-cols-2',
  '3': 'atMedium:grid-cols-2 atLarge:grid-cols-3',
  '4': 'atMedium:grid-cols-2 atLarge:grid-cols-4',
} as const

/**
 * One row of `features` - its own component (not inlined in the `.map()`
 * below) so `useEditableField` can be called at each item's own top level,
 * per the Rules of Hooks.
 */
function FeatureItem({
  blockId,
  feature,
  index,
}: {
  blockId?: string | null
  feature: { id?: string; title: string; body?: string; image?: unknown }
  index: number
}) {
  const titleField = useEditableField({
    blockId,
    fieldPath: `features.${index}.title`,
    value: feature.title,
  })
  const bodyField = useEditableField({
    blockId,
    fieldPath: `features.${index}.body`,
    value: feature.body ?? '',
    multiline: true,
  })

  return (
    <Stack gap="sm">
      {isDoc<Media>(feature.image) && <MediaImage image={feature.image as Media} size="card" />}
      <Heading level={3} size={5} {...titleField.fieldProps}>
        {titleField.content}
      </Heading>
      {(feature.body || bodyField.isEditable) && (
        <p className="ui-paragraph whitespace-pre-wrap" {...bodyField.fieldProps}>
          {bodyField.content}
        </p>
      )}
    </Stack>
  )
}

/** Repeater block: proves the array-field shape against the primitives. */
export function FeatureGrid(props: FeatureGridBlock) {
  const { id, surface, heading, intro, columns, features } = props
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading ?? '' })
  const introField = useEditableField({
    blockId: id,
    fieldPath: 'intro',
    value: intro ?? '',
    multiline: true,
  })
  if (!features?.length) return null

  return (
    <Section blockId={id} surface={surface}>
      <Container className="ui-section-container">
        <Stack gap="lg">
          {(heading || intro || headingField.isEditable || introField.isEditable) && (
            <Stack gap="sm" className="max-w-[70ch]">
              {(heading || headingField.isEditable) && (
                <Heading level={2} {...headingField.fieldProps}>
                  {headingField.content}
                </Heading>
              )}
              {(intro || introField.isEditable) && (
                <p className="ui-paragraph whitespace-pre-wrap" {...introField.fieldProps}>
                  {introField.content}
                </p>
              )}
            </Stack>
          )}

          <div
            className={`grid grid-cols-1 gap-10 ${COLUMNS[(columns as keyof typeof COLUMNS) ?? '3'] ?? COLUMNS['3']}`}
          >
            {features.map((feature, index) => (
              <FeatureItem key={feature.id ?? index} blockId={id} feature={feature} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
