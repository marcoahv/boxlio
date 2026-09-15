import { Section, Container, Stack, Heading } from '@/components/primitives'
import { MediaImage } from '@/components/MediaImage'
import { isDoc } from '@/utilities/isDoc'
import type { FeatureGridBlock, Media } from '@/payload-types'

// Literal class strings — Tailwind's scanner cannot resolve interpolation.
const COLUMNS = {
  '2': 'atMedium:grid-cols-2',
  '3': 'atMedium:grid-cols-2 atLarge:grid-cols-3',
  '4': 'atMedium:grid-cols-2 atLarge:grid-cols-4',
} as const

/** Repeater block: proves the array-field shape against the primitives. */
export function FeatureGrid(props: FeatureGridBlock) {
  const { surface, heading, intro, columns, features } = props
  if (!features?.length) return null

  return (
    <Section surface={surface}>
      <Container>
        <Stack gap="lg">
          {(heading || intro) && (
            <Stack gap="sm" className="max-w-[70ch]">
              {heading && <Heading level={2}>{heading}</Heading>}
              {intro && <p className="ui-paragraph">{intro}</p>}
            </Stack>
          )}

          <div
            className={`grid grid-cols-1 gap-10 ${COLUMNS[(columns as keyof typeof COLUMNS) ?? '3'] ?? COLUMNS['3']}`}
          >
            {features.map(
              (
                feature: { id?: string; title: string; body?: string; image?: unknown },
                index: number,
              ) => (
                <Stack key={feature.id ?? index} gap="sm">
                  {isDoc<Media>(feature.image) && (
                    <MediaImage image={feature.image as Media} size="card" />
                  )}
                  <Heading level={3} size={5}>
                    {feature.title}
                  </Heading>
                  {feature.body && <p className="ui-paragraph">{feature.body}</p>}
                </Stack>
              ),
            )}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
