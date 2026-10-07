import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Stats: Block = {
  slug: 'stats',
  interfaceName: 'StatsBlock',
  labels: { singular: 'Stats', plural: 'Stats' },
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
              maxRows: 8,
              required: true,
              labels: { singular: 'Stat', plural: 'Stats' },
              admin: {
                className: 'field-label--sidebar-badge',
              },
              fields: [
                {
                  // Text, not number: "10k+", "99.9%" and "$2M" are all
                  // ordinary stat values and a number field cannot hold them.
                  name: 'value',
                  type: 'text',
                  required: true,
                  admin: {
                    description: 'The figure itself, e.g. "10k+", "99.9%" or "$2M".',
                  },
                },
                { name: 'label', type: 'text', required: true },
              ],
            },
          ],
        },
        {
          label: 'Layout',
          fields: [
            ...appearanceField(undefined, 'field-label--sidebar-badge'),
            {
              name: 'columns',
              type: 'select',
              defaultValue: '4',
              admin: {
                className: 'field-label--sidebar-badge',
              },
              options: [
                { label: 'Two', value: '2' },
                { label: 'Three', value: '3' },
                { label: 'Four', value: '4' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
