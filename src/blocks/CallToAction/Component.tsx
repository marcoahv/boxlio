import Link from 'next/link'
import { Section, Container, Stack, Heading } from '@/components/primitives'
import type { CallToActionBlock } from '@/payload-types'

/**
 * Short conversion band. Defaults to the inverse surface so it reads as a
 * deliberate interruption — and because surfaces carry their own foreground,
 * that stays legible after any palette change.
 */
export function CallToAction(props: CallToActionBlock) {
  const { surface, heading, body, align, links } = props
  const centered = align !== 'left'

  return (
    <Section surface={surface ?? 'inverse'} spacing="tight">
      <Container width="narrow">
        <Stack gap="md" align={centered ? 'center' : 'start'}>
          <Heading level={2} className={centered ? 'text-center' : undefined}>
            {heading}
          </Heading>

          {body && (
            <p className={`ui-paragraph max-w-[60ch] ${centered ? 'text-center' : ''}`}>{body}</p>
          )}

          {links?.length > 0 && (
            <Stack direction="row" gap="sm" wrap align="center">
              {links.map((link) => (
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
      </Container>
    </Section>
  )
}
