import { type GlobalConfig } from 'payload'
import { revalidateGlobal } from '@/globals/hooks/revalidateGlobal'
import { isHexColor } from '@/utilities/color'

const HEX_VALIDATION_ERROR = 'Enter a valid hex color (e.g. #d6c1a1).'

const colorField = ({
  name,
  label,
  defaultValue,
}: {
  name: string
  label: string
  defaultValue: string
}) => ({
  name,
  label,
  type: 'text' as const,
  defaultValue,
  admin: {
    components: {
      Field: '@/custom/color/Component.tsx#ColorPickerField',
    },
  },
  validate: (value: unknown) => (isHexColor(value) ? true : HEX_VALIDATION_ERROR),
})

export const Settings: GlobalConfig = {
  slug: 'settings',
  label: 'Site Settings',
  hooks: {
    afterChange: [revalidateGlobal],
  },
  fields: [
    {
      type: 'tabs',
      admin: {
        className: 'settings-tabs',
      },
      tabs: [
        {
          label: 'Information',
          fields: [
            {
              name: 'siteName',
              type: 'text',
              required: true,
              defaultValue: 'Site Builder',
            },
            {
              name: 'siteDescription',
              type: 'textarea',
              defaultValue:
                'A site built with the site builder.',
            },
            {
              type: 'text',
              name: 'gtmCode',
              label: 'Google Tag Manager',
              admin: {
                description: 'Add your Google Tag Manager Code (GTM-XXXXXX)',
              },
            },
            {
              name: 'icon',
              label: 'Site Icon',
              type: 'upload',
              relationTo: 'media',
              required: true,
              admin: {
                description: 'The small mark used as the browser tab favicon. Usually square, e.g. 32×32 or 64×64.',
              },
            },
            {
              name: 'iconDark',
              label: 'Site Icon (dark mode)',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  "Optional. Shown when the visitor's browser prefers a dark color scheme. Falls back to the main icon.",
              },
            },
          ],
        },
        {
          label: 'Corners',
          fields: [
            {
              name: 'imageRadius',
              type: 'select',
              label: 'Image Corner Radius',
              defaultValue: 'md',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
                { label: 'Extra Large', value: 'xl' },
              ],
              admin: {
                description: 'Controls how rounded image corners are across the site.',
              },
            },
            {
              name: 'buttonRadius',
              type: 'select',
              label: 'Button Corner Radius',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
                { label: 'Extra Large', value: 'xl' },
              ],
              admin: {
                description: 'Controls how rounded button corners are across the site.',
              },
            },
          ],
        },
        {
          label: 'Shadows',
          fields: [
            {
              name: 'imageShadow',
              type: 'select',
              label: 'Image Shadow',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
              ],
              admin: {
                description: 'Controls the drop shadow applied to images across the site.',
              },
            },
            {
              name: 'buttonShadow',
              type: 'select',
              label: 'Button Shadow',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
              ],
              admin: {
                description: 'Controls the drop shadow applied to buttons across the site.',
              },
            },
            {
              name: 'cardShadow',
              type: 'select',
              label: 'Card Shadow',
              defaultValue: 'none',
              options: [
                { label: 'None', value: 'none' },
                { label: 'Small', value: 'sm' },
                { label: 'Medium', value: 'md' },
                { label: 'Large', value: 'lg' },
              ],
              admin: {
                description:
                  'Controls the resting drop shadow applied to cards across the site (separate from the existing hover shadow).',
              },
            },
          ],
        },
        {
          label: 'Colors',
          fields: [
            {
              type: 'collapsible',
              label: 'Primary',
              admin: { initCollapsed: false },
              fields: [
                colorField({
                  name: 'primaryColor',
                  label: 'Primary Color',
                  defaultValue: '#d6c1a1',
                }),
                colorField({
                  name: 'primaryColorLight',
                  label: 'Primary Color (Light)',
                  defaultValue: '#e2dbcf',
                }),
                colorField({
                  name: 'primaryColorDark',
                  label: 'Primary Color (Dark)',
                  defaultValue: '#b2905c',
                }),
              ],
            },
            {
              type: 'collapsible',
              label: 'Secondary',
              admin: { initCollapsed: false },
              fields: [
                colorField({
                  name: 'secondaryColor',
                  label: 'Secondary Color',
                  defaultValue: '#49b7d2',
                }),
                colorField({
                  name: 'secondaryColorLight',
                  label: 'Secondary Color (Light)',
                  defaultValue: '#9fd0dc',
                }),
                colorField({
                  name: 'secondaryColorDark',
                  label: 'Secondary Color (Dark)',
                  defaultValue: '#137c95',
                }),
              ],
            },
          ],
        },
      ],
    },
  ],
}
