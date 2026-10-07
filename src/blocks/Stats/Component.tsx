import { Section, Container, Stack, Heading } from '@/components/primitives'
import { useEditableField } from '@/utilities/useEditableField'
import type { StatsBlock } from '@/payload-types'

// Literal class strings — Tailwind's scanner cannot resolve interpolation.
// A local copy of FeatureGrid's map rather than a shared import: extracting it
// would mean editing a shipped block, which this feature deliberately leaves
// alone.
const COLUMNS = {
  '2': 'atMedium:grid-cols-2',
  '3': 'atMedium:grid-cols-2 atLarge:grid-cols-3',
  '4': 'atMedium:grid-cols-2 atLarge:grid-cols-4',
} as const

type StatItemData = NonNullable<StatsBlock['items']>[number]

/**
 * One value/label pair. Its own component so each item's hooks are called at
 * its own top level, per the Rules of Hooks - see `FeatureGrid`'s
 * `FeatureItem` for the same reasoning.
 *
 * Neither element is a heading: a stat is a figure, not a section title, so
 * it carries the heading *size* utility without entering the page outline.
 */
function StatItem({
  blockId,
  item,
  index,
}: {
  blockId?: string | null
  item: StatItemData
  index: number
}) {
  const valueField = useEditableField({
    blockId,
    fieldPath: `items.${index}.value`,
    value: item.value,
  })
  const labelField = useEditableField({
    blockId,
    fieldPath: `items.${index}.label`,
    value: item.label,
  })

  return (
    <Stack gap="sm">
      <p className="ui-heading-2" {...valueField.fieldProps}>
        {valueField.content}
      </p>
      <p className="ui-paragraph" {...labelField.fieldProps}>
        {labelField.content}
      </p>
    </Stack>
  )
}

/** A row of headline figures. */
export function Stats(props: StatsBlock) {
  const { id, surface, heading, items, columns } = props
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
            className={`grid grid-cols-1 gap-10 ${COLUMNS[(columns as keyof typeof COLUMNS) ?? '4'] ?? COLUMNS['4']}`}
          >
            {items.map((item, index) => (
              <StatItem key={item.id ?? index} blockId={id} item={item} index={index} />
            ))}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
