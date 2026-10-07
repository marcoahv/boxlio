// The first block that needs this directive. Other blocks reach their hooks
// only through `useEditableField`, which carries its own `'use client'`; this
// one imports `useState`/`useId` straight from React, and `registry.ts` is
// pulled into a Server Component graph via `payload.config.ts`, so without
// the directive the build fails.
'use client'

import { useId, useState } from 'react'

import { Section, Container, Stack, Heading } from '@/components/primitives'
import { useIsEditableField } from '@/utilities/EditableFieldContext'
import { useEditableField } from '@/utilities/useEditableField'
import type { AccordionBlock } from '@/payload-types'

import { toggleOpen } from './openState'

/**
 * Disclosure arrow. Decorative - the accessible name and state live on the
 * button itself (`aria-expanded`), so this is hidden from assistive tech.
 */
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className={`ui-accordion-chevron size-5 shrink-0 ${open ? 'rotate-180' : ''}`}
    >
      <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

type AccordionItemData = NonNullable<AccordionBlock['items']>[number]

/**
 * One question/answer pair.
 *
 * Its own component rather than inlined in the `.map()` below so each item's
 * hooks are called at its own top level, per the Rules of Hooks - the same
 * reason `FeatureGrid`'s `FeatureItem` exists.
 */
function AccordionItem({
  blockId,
  item,
  index,
  isEditing,
  isOpen,
  onToggle,
  headerId,
  panelId,
}: {
  blockId?: string | null
  item: AccordionItemData
  index: number
  isEditing: boolean
  isOpen: boolean
  onToggle: () => void
  headerId: string
  panelId: string
}) {
  const questionField = useEditableField({
    blockId,
    fieldPath: `items.${index}.question`,
    value: item.question,
  })
  const answerField = useEditableField({
    blockId,
    fieldPath: `items.${index}.answer`,
    value: item.answer,
    multiline: true,
  })

  return (
    <div className="ui-accordion-item">
      {isEditing ? (
        // While inline editing is on, the header is NOT a button. Two reasons:
        // `useEditableField`'s click handler calls `preventDefault` but not
        // `stopPropagation`, so a click on the question would bubble and
        // collapse the panel being edited; and `contentEditable` inside a
        // <button> does not reliably receive text input. Toggling moves to a
        // dedicated adjacent control instead.
        <div className="flex items-center justify-between gap-4 py-4">
          <Heading level={3} size={5} id={headerId} {...questionField.fieldProps}>
            {questionField.content}
          </Heading>
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            aria-label={isOpen ? 'Collapse answer' : 'Expand answer'}
            className="shrink-0"
          >
            <Chevron open={isOpen} />
          </button>
        </div>
      ) : (
        // <h3> wrapping the <button>, per the W3C APG accordion pattern: the
        // button carries the state and the heading keeps the page outline.
        <Heading level={3} size={5}>
          <button
            type="button"
            id={headerId}
            onClick={onToggle}
            aria-expanded={isOpen}
            aria-controls={panelId}
            className="flex w-full items-center justify-between gap-4 py-4 text-left"
          >
            <span>{item.question}</span>
            <Chevron open={isOpen} />
          </button>
        </Heading>
      )}

      {/* Animated open/closed by `_accordion.css` off `data-open`, which is
          also why the panel is never unmounted and never uses the `hidden`
          attribute: `display: none` cannot be transitioned, and keeping the
          node mounted is what lets the answer's `useEditableField` ref
          survive a collapse - a remount would re-render its frozen `content`
          and strand the element on a stale value. The collapsed panel is
          still taken out of the accessibility tree and tab order, by
          `visibility: hidden`.

          The inner wrapper is required by the grid-row animation (it is the
          element allowed to overflow and shrink to zero) and carries the
          padding, which would otherwise stay visible at full height while
          collapsed. */}
      <div
        id={panelId}
        role="region"
        aria-labelledby={headerId}
        data-open={isOpen ? 'true' : 'false'}
        className="ui-accordion-panel"
      >
        <div className="pb-4">
          <p className="ui-paragraph whitespace-pre-wrap" {...answerField.fieldProps}>
            {answerField.content}
          </p>
        </div>
      </div>
    </div>
  )
}

/** FAQ-style disclosure list. The first registry block with visitor state. */
export function Accordion(props: AccordionBlock) {
  const { id, surface, heading, items, allowMultiple } = props
  // Guarantees unique ARIA ids even for two Accordion blocks on one page, and
  // unlike the block's own `id` it is always present (a block rendered from an
  // unsaved live-preview payload may not have one yet).
  const baseId = useId()
  const isEditing = useIsEditableField() && Boolean(id)
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading ?? '' })

  // What this set MEANS depends on the mode, which is what lets both modes
  // share one piece of state with the same empty initial value - no effect, no
  // resynchronising when inline editing turns on mid-session:
  //
  //   normal   - the ids that are OPEN      (default: all collapsed)
  //   editing  - the ids that are COLLAPSED (default: all expanded)
  //
  // Everything starts expanded while editing because a collapsed panel's
  // answer is hidden, and hidden text cannot be clicked to edit. Because the
  // state never derives from `items`, a live-preview keystroke (which gives
  // `items` a new identity every time) can't reopen a panel the editor
  // deliberately collapsed, and a newly added row is expanded by default.
  const [flippedIds, setFlippedIds] = useState<string[]>([])

  if (!items?.length) return null

  const itemKeys = items.map((item, index) => item.id ?? `index-${index}`)

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

          <div>
            {items.map((item, index) => {
              const isFlipped = flippedIds.includes(itemKeys[index])
              return (
                <AccordionItem
                  key={itemKeys[index]}
                  blockId={id}
                  item={item}
                  index={index}
                  isEditing={isEditing}
                  isOpen={isEditing ? !isFlipped : isFlipped}
                  onToggle={() =>
                    setFlippedIds((current) =>
                      // `isEditing ||`: the editor's single-open preference is
                      // a visitor-facing reading aid, so it has no meaning
                      // over a set of deliberate collapses. While editing,
                      // panels always toggle independently.
                      toggleOpen(current, itemKeys[index], isEditing || Boolean(allowMultiple)),
                    )
                  }
                  headerId={`${baseId}-${index}-header`}
                  panelId={`${baseId}-${index}-panel`}
                />
              )
            })}
          </div>
        </Stack>
      </Container>
    </Section>
  )
}
