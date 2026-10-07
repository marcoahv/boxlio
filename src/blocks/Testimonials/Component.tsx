import { Section, Container, Stack, Heading } from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import { useEditableField } from '@/utilities/useEditableField'
import type { TestimonialsBlock, Media } from '@/payload-types'

// Literal class strings — Tailwind's scanner cannot resolve interpolation. Same
// map FeatureGrid/Stats already use.
const COLUMNS = {
  '2': 'atMedium:grid-cols-2',
  '3': 'atMedium:grid-cols-2 atLarge:grid-cols-3',
  '4': 'atMedium:grid-cols-2 atLarge:grid-cols-4',
} as const

type TestimonialItemData = NonNullable<TestimonialsBlock['items']>[number]

/**
 * One quote/author pair. Its own component so `useEditableField` is called
 * at each item's own top level, per the Rules of Hooks — see `FeatureGrid`'s
 * `FeatureItem` for the same reasoning.
 */
function TestimonialItem({
  blockId,
  item,
  index,
}: {
  blockId?: string | null
  item: TestimonialItemData
  index: number
}) {
  const quoteField = useEditableField({
    blockId,
    fieldPath: `items.${index}.quote`,
    value: item.quote,
    multiline: true,
  })
  const authorField = useEditableField({
    blockId,
    fieldPath: `items.${index}.author`,
    value: item.author,
  })

  return (
    <Stack gap="sm">
      {isDoc<Media>(item.avatar) && (
        <MediaImage image={item.avatar as Media} size="thumbnail" imgClassName="rounded-full" />
      )}
      <p className="ui-paragraph whitespace-pre-wrap" {...quoteField.fieldProps}>
        {quoteField.content}
      </p>
      <p className="ui-heading-6" {...authorField.fieldProps}>
        {authorField.content}
      </p>
    </Stack>
  )
}

/** A grid of quote/author (and optional avatar) cards. */
export function Testimonials(props: TestimonialsBlock) {
  const { id, surface, heading, columns, items } = props
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

          <div
            className={`grid grid-cols-1 gap-10 ${COLUMNS[(columns as keyof typeof COLUMNS) ?? '3'] ?? COLUMNS['3']}`}
          >
            {items.map((item, index) => (
              <TestimonialItem key={item.id ?? index} blockId={id} item={item} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
