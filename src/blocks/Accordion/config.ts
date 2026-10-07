import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Accordion: Block = {
  slug: 'accordion',
  interfaceName: 'AccordionBlock',
  labels: { singular: 'Accordion', plural: 'Accordions' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'heading',
              type: 'text',
              admin: {
                className: 'field-label--sidebar-badge',
              },
            },
            {
              name: 'items',
              type: 'array',
              minRows: 1,
              required: true,
              labels: { singular: 'Item', plural: 'Items' },
              admin: {
                className: 'field-label--sidebar-badge',
              },
              fields: [
                { name: 'question', type: 'text', required: true },
                // Plain multiline text, not rich text: it keeps this field
                // inside feature 29a's inline-editing convention (the same
                // thing FeatureGrid's `body` does) rather than needing 30a's
                // Lexical toolbar extended to a rich text field nested in an
                // array. Answers therefore carry no links or bold.
                { name: 'answer', type: 'textarea', required: true },
              ],
            },
          ],
        },
        {
          label: 'Layout',
          fields: [
            ...appearanceField(undefined, 'field-label--sidebar-badge'),
            {
              // No `className`: checkboxes are exempt from the sidebar-badge
              // treatment, matching Hero's `videoLoop` and Table's
              // `hasHeaderRow`.
              name: 'allowMultiple',
              type: 'checkbox',
              defaultValue: false,
              label: 'Allow multiple open at once',
              admin: {
                description:
                  'When off, opening an item closes the others. When on, visitors can keep several answers open at the same time.',
              },
            },
          ],
        },
      ],
    },
  ],
}
