import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const FeatureGrid: Block = {
  slug: 'featureGrid',
  interfaceName: 'FeatureGridBlock',
  labels: { singular: 'Feature Grid', plural: 'Feature Grids' },
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
              name: 'intro',
              type: 'textarea',
              admin: {
                className: 'field-label--sidebar-badge',
              },
            },
            {
              name: 'features',
              type: 'array',
              minRows: 1,
              maxRows: 12,
              required: true,
              labels: { singular: 'Feature', plural: 'Features' },
              admin: {
                className: 'field-label--sidebar-badge',
                components: {
                  RowLabel: '@/custom/label/Component.tsx#CardRowLabel',
                },
              },
              fields: [
                { name: 'title', type: 'text', required: true },
                { name: 'body', type: 'textarea' },
                { name: 'image', type: 'upload', relationTo: 'media' },
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
              defaultValue: '3',
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
