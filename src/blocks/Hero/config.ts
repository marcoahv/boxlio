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
      admin: {
        description:
          'Shown beside the text (Image left/right) or as a full-bleed background (Image background).',
      },
    },
    {
      name: 'layout',
      type: 'radio',
      defaultValue: 'imageRight',
      admin: {
        description:
          'Image background overrides the Appearance surface above with light text over a dark overlay, so it stays legible over any photo.',
      },
      options: [
        { label: 'Image right', value: 'imageRight' },
        { label: 'Image left', value: 'imageLeft' },
        { label: 'Image background', value: 'backgroundImage' },
        { label: 'Text only', value: 'textOnly' },
      ],
    },
    {
      name: 'overlayCoverage',
      label: 'Overlay coverage',
      type: 'radio',
      defaultValue: 'full',
      admin: {
        description: 'Only applies to the Image background layout.',
        condition: (_, siblingData) =>
          siblingData?.layout === 'backgroundImage',
      },
      options: [
        { label: 'Whole image', value: 'full' },
        { label: 'Text area only', value: 'content' },
      ],
    },
    {
      name: 'overlayColor',
      label: 'Overlay color',
      type: 'radio',
      defaultValue: 'dark',
      admin: {
        description: 'Only applies to the Image background layout.',
        condition: (_, siblingData) =>
          siblingData?.layout === 'backgroundImage',
      },
      options: [
        { label: 'Dark', value: 'dark' },
        { label: 'Light', value: 'light' },
        { label: 'Primary', value: 'primary' },
        { label: 'Secondary', value: 'secondary' },
      ],
    },
    {
      name: 'overlayOpacity',
      label: 'Overlay opacity',
      type: 'radio',
      defaultValue: 'medium',
      admin: {
        description: 'Only applies to the Image background layout.',
        condition: (_, siblingData) =>
          siblingData?.layout === 'backgroundImage',
      },
      options: [
        { label: 'None', value: 'none' },
        { label: 'Light', value: 'light' },
        { label: 'Medium', value: 'medium' },
        { label: 'Strong', value: 'strong' },
        { label: 'Solid', value: 'solid' },
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
