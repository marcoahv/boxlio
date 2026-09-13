import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
  fields: [
    ...appearanceField(),
    {
      name: 'heading',
      type: 'text',
      required: true,
    },
    {
      name: 'subheading',
      type: 'textarea',
    },
    {
      name: 'image',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'layout',
      type: 'radio',
      defaultValue: 'imageRight',
      options: [
        { label: 'Image right', value: 'imageRight' },
        { label: 'Image left', value: 'imageLeft' },
        { label: 'Text only', value: 'textOnly' },
      ],
    },
    {
      name: 'links',
      type: 'array',
      maxRows: 2,
      label: 'Buttons',
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
