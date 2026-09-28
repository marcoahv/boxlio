import Link from 'next/link'
import { Section, Container, Stack, Heading } from '@/components/primitives'
import { useEditableField } from '@/utilities/useEditableField'
import type { CallToActionBlock } from '@/payload-types'

type CallToActionLink = NonNullable<CallToActionBlock['links']>[number]

/**
 * Its own component (not inlined in the `.map()` below) so `useEditableField`
 * can be called at each link's own top level, per the Rules of Hooks - same
 * pattern as `FeatureGrid`'s `FeatureItem` / Hero's `HeroLinkButton`.
 */
function CallToActionLinkButton({
  blockId,
  index,
  link,
}: {
  blockId?: string | null
  index: number
  link: CallToActionLink
}) {
  const labelField = useEditableField({
    blockId,
    fieldPath: `links.${index}.label`,
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
 * Short conversion band. Defaults to the inverse surface so it reads as a
 * deliberate interruption — and because surfaces carry their own foreground,
 * that stays legible after any palette change.
 */
export function CallToAction(props: CallToActionBlock) {
  const { id, surface, heading, body, align, links } = props
  const centered = align !== 'left'
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading })
  const bodyField = useEditableField({
    blockId: id,
    fieldPath: 'body',
    value: body ?? '',
    multiline: true,
  })

  return (
    <Section blockId={id} surface={surface ?? 'inverse'} spacing="tight">
      <Container className="ui-section-container">
        <Stack gap="md" align={centered ? 'center' : 'start'}>
          <Heading
            level={2}
            className={centered ? 'text-center' : undefined}
            {...headingField.fieldProps}
          >
            {headingField.content}
          </Heading>

          {(body || bodyField.isEditable) && (
            <p
              className={`ui-paragraph max-w-[60ch] whitespace-pre-wrap ${centered ? 'text-center' : ''}`}
              {...bodyField.fieldProps}
            >
              {bodyField.content}
            </p>
          )}

          {links?.length > 0 && (
            <Stack direction="row" gap="sm" wrap align="center">
              {links.map((link, index) => (
                <CallToActionLinkButton
                  key={link.id ?? link.url}
                  blockId={id}
                  index={index}
                  link={link}
                />
              ))}
            </Stack>
          )}
        </Stack>
      </Container>
    </Section>
  )
}
