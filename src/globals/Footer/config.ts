import { type GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/globals/hooks/revalidateGlobal'
import { appearanceField } from '@/fields/appearance'
import { linkField } from '@/fields/link'

export const Footer: GlobalConfig = {
  slug: 'footer',
  admin: {
    group: 'Site Identity',
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    ...appearanceField(),
    {
      name: 'navLinks',
      label: 'Nav Links',
      type: 'array',
      maxRows: 6,
      labels: { singular: 'Navigation Link', plural: 'Navigation Links' },
      admin: {
        components: {
          RowLabel: {
            path: '@/custom/label/Component.tsx#ArrayRowLabel',
          },
        },
      },
      fields: [
        ...linkField(),
        {
          name: 'newTab',
          label: 'Open in a new tab',
          type: 'checkbox',
        },
      ],
    },
  ],
}
