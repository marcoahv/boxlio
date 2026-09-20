import { type GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/globals/hooks/revalidateGlobal'
import { headerAppearanceField } from '@/fields/appearance'
import { linkField } from '@/fields/link'

export const Header: GlobalConfig = {
  slug: 'header',
  admin: {
    group: 'Site Identity',
  },
  access: {
    read: () => true,
    update: ({ req }) => Boolean(req.user),
  },
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    ...headerAppearanceField(),
    {
      name: 'logo',
      label: 'Logo',
      type: 'upload',
      relationTo: 'media',
      required: true,
    },
    {
      name: 'logoDark',
      label: 'Logo (dark mode)',
      type: 'upload',
      relationTo: 'media',
      admin: {
        description:
          'Optional. Shown wherever the header background is dark — for a Default surface that’s the visitor’s dark color scheme, but for an Inverse surface it’s the opposite (light color scheme). Falls back to the main logo.',
      },
    },
    {
      name: 'navLinks',
      label: 'Nav Links',
      type: 'array',
      minRows: 1,
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
    {
      name: 'socialLinks',
      label: 'Social Links',
      type: 'array',
      maxRows: 6,
      labels: { singular: 'Social Link', plural: 'Social Links' },
      fields: [
        {
          name: 'platform',
          label: 'Platform',
          type: 'select',
          required: true,
          options: [
            { label: 'Facebook', value: 'facebook' },
            { label: 'Instagram', value: 'instagram' },
            { label: 'X / Twitter', value: 'twitter' },
            { label: 'LinkedIn', value: 'linkedin' },
            { label: 'GitHub', value: 'github' },
            { label: 'YouTube', value: 'youtube' },
          ],
        },
        {
          name: 'url',
          label: 'URL',
          type: 'text',
          required: true,
        },
        {
          name: 'icon',
          label: 'Icon',
          type: 'upload',
          relationTo: 'media',
          required: true,
        },
      ],
    },
    {
      name: 'ctaButtons',
      label: 'Call to Action Buttons',
      type: 'array',
      maxRows: 2,
      labels: { singular: 'Button', plural: 'Buttons' },
      fields: [
        { name: 'label', type: 'text', required: true },
        { name: 'url', type: 'text', required: true },
        {
          name: 'variant',
          type: 'select',
          defaultValue: 'solid',
          options: [
            { label: 'Solid', value: 'solid' },
            { label: 'Outline', value: 'outline' },
            { label: 'Ghost', value: 'ghost' },
          ],
        },
        {
          name: 'color',
          type: 'select',
          defaultValue: 'primary',
          options: [
            { label: 'Primary', value: 'primary' },
            { label: 'Secondary', value: 'secondary' },
          ],
        },
      ],
    },
  ],
}
