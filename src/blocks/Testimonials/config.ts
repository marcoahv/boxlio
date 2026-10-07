import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Testimonials: Block = {
  slug: 'testimonials',
  interfaceName: 'TestimonialsBlock',
  labels: { singular: 'Testimonials', plural: 'Testimonials' },
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
              labels: { singular: 'Testimonial', plural: 'Testimonials' },
              admin: {
                className: 'field-label--sidebar-badge',
              },
              fields: [
                { name: 'quote', type: 'textarea', required: true },
                { name: 'author', type: 'text', required: true },
                { name: 'avatar', type: 'upload', relationTo: 'media' },
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
