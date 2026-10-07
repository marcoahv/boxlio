import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const LogoCloud: Block = {
  slug: 'logoCloud',
  interfaceName: 'LogoCloudBlock',
  labels: { singular: 'Logo Cloud', plural: 'Logo Clouds' },
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
              labels: { singular: 'Logo', plural: 'Logos' },
              admin: {
                className: 'field-label--sidebar-badge',
              },
              fields: [{ name: 'logo', type: 'upload', relationTo: 'media', required: true }],
            },
          ],
        },
        {
          label: 'Layout',
          fields: [...appearanceField(undefined, 'field-label--sidebar-badge')],
        },
      ],
    },
  ],
}
