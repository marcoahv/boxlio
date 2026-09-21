import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Hero: Block = {
  slug: 'hero',
  interfaceName: 'HeroBlock',
  labels: { singular: 'Hero', plural: 'Heroes' },
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
              required: true,
              admin: {
                // Matches the Button(s) array field's label size - see
                // custom.scss's own comment on this class for why an array
                // field's label renders bigger by default.
                className: 'field-label--match-array-label',
              },
            },
            {
              name: 'subheading',
              type: 'textarea',
              admin: {
                className: 'field-label--match-array-label',
              },
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Shown beside the text (Image left/right) or as a full-bleed background (Image background).',
                className: 'field-label--match-array-label',
              },
            },
            {
              name: 'links',
              type: 'array',
              maxRows: 2,
              label: 'Button(s)',
              labels: { singular: 'Button', plural: 'Buttons' },
              admin: {
                initCollapsed: true,
                components: {
                  RowLabel: {
                    path: '@/custom/label/Component.tsx#ArrayRowLabel',
                    clientProps: { fallbackLabel: 'Button' },
                  },
                },
              },
              fields: [
                {
                  type: 'row',
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'url', type: 'text', required: true },
                  ],
                },
                {
                  type: 'row',
                  fields: [
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
            },
          ],
        },
        {
          label: 'Layout',
          fields: [
            {
              name: 'layout',
              type: 'radio',
              defaultValue: 'imageRight',
              admin: {
                description:
                  'Image background overrides the Appearance surface below with light text over a dark overlay, so it stays legible over any photo.',
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
            ...appearanceField(),
          ],
        },
      ],
    },
  ],
}
