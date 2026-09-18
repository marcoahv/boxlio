import { Section, Container } from '@/components/primitives'
import { RichText } from '@/components/RichText'
import type { RichTextBlock as RichTextBlockProps } from '@/payload-types'

/**
 * Lexical prose, rendered through the shared converters.
 *
 * Width/spacing come from Settings (--rich-text-max-width/--rich-text-space,
 * via the ui-rich-text-container/ui-rich-text-section marker classes - see
 * _section.css), not a per-instance field - shared with a Post's own
 * bodyAppearance section in PostClient.tsx.
 */
export function RichTextBlock(props: RichTextBlockProps) {
  const { id, surface, content } = props
  if (!content) return null

  return (
    <Section blockId={id} surface={surface} className="ui-rich-text-section">
      <Container className="ui-rich-text-container">
        <div className="ui-prose">
          <RichText data={content} />
        </div>
      </Container>
    </Section>
  )
}
