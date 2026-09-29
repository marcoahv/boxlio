import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const CallToAction: Block = {
  slug: 'callToAction',
  interfaceName: 'CallToActionBlock',
  labels: { singular: 'Call to Action', plural: 'Calls to Action' },
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
                className: 'field-label--sidebar-badge',
              },
            },
            {
              name: 'body',
              type: 'textarea',
              admin: {
                className: 'field-label--sidebar-badge',
              },
            },
            {
              name: 'links',
              type: 'array',
              minRows: 1,
              maxRows: 2,
              required: true,
              labels: { singular: 'Link', plural: 'Links' },
              admin: {
                className: 'field-label--sidebar-badge',
                initCollapsed: true,
                components: {
                  RowLabel: '@/custom/label/Component.tsx#ArrayRowLabel',
                },
              },
              fields: [
                {
                  type: 'row',
                  admin: {
                    className: 'field-row--no-stack',
                  },
                  fields: [
                    { name: 'label', type: 'text', required: true },
                    { name: 'url', type: 'text', required: true },
                  ],
                },
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
        {
          label: 'Layout',
          fields: [
            ...appearanceField(undefined, 'field-label--sidebar-badge'),
            {
              name: 'align',
              type: 'radio',
              defaultValue: 'center',
              admin: {
                className: 'field-label--sidebar-badge',
              },
              options: [
                { label: 'Center', value: 'center' },
                { label: 'Left', value: 'left' },
              ],
            },
          ],
        },
      ],
    },
  ],
}
