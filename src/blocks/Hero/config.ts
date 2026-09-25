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
              name: 'mediaType',
              label: 'Media type',
              type: 'radio',
              defaultValue: 'image',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.layout === 'split' || siblingData?.layout === 'backgroundImage',
              },
              options: [
                { label: 'Image', value: 'image' },
                { label: 'Video', value: 'video' },
              ],
            },
            {
              name: 'image',
              type: 'upload',
              relationTo: 'media',
              admin: {
                description:
                  'Shown beside the text (Split) or as a full-bleed background (Media Background).',
                className: 'field-label--match-array-label',
                condition: (_, siblingData) =>
                  !(
                    (siblingData?.layout === 'split' || siblingData?.layout === 'backgroundImage') &&
                    siblingData?.mediaType === 'video'
                  ),
              },
            },
            {
              name: 'video',
              type: 'upload',
              relationTo: 'media',
              filterOptions: {
                mimeType: { contains: 'video' },
              },
              admin: {
                className: 'field-label--match-array-label',
                condition: (_, siblingData) =>
                  (siblingData?.layout === 'split' || siblingData?.layout === 'backgroundImage') &&
                  siblingData?.mediaType === 'video',
              },
            },
            {
              type: 'row',
              admin: {
                // Loop/Hide controls only make sense for Split's inline,
                // controllable video - Media Background video is always
                // forced autoplay/muted/loop with no controls (see
                // Component.tsx), so this row stays Split-only.
                condition: (_, siblingData) =>
                  siblingData?.layout === 'split' && siblingData?.mediaType === 'video',
              },
              fields: [
                {
                  name: 'videoLoop',
                  label: 'Loop',
                  type: 'checkbox',
                  defaultValue: false,
                },
                {
                  name: 'videoHideControls',
                  label: 'Hide controls',
                  type: 'checkbox',
                  defaultValue: false,
                  admin: {
                    description:
                      'Hides the player controls and autoplays the video muted instead, since a hidden-control video would otherwise have no way to start.',
                  },
                },
              ],
            },
            {
              name: 'links',
              type: 'array',
              maxRows: 2,
              label: 'Button(s)',
              labels: { singular: 'Button', plural: 'Buttons' },
              admin: {
                // Payload's Array field has no option to disable a row's
                // collapse toggle - only `initCollapsed` for its initial
                // state - so this class scopes a CSS override in custom.scss
                // that disables it instead. Rows must start open now that
                // they can't be toggled closed.
                className: 'hero-buttons-array',
                initCollapsed: false,
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
              label: false,
              type: 'radio',
              defaultValue: 'split',
              options: [
                { label: 'Text-only', value: 'textOnly' },
                { label: 'Split', value: 'split' },
                { label: 'Media Background', value: 'backgroundImage' },
              ],
            },
            {
              name: 'headerPosition',
              label: 'Text position',
              type: 'radio',
              defaultValue: 'left',
              admin: {
                condition: (_, siblingData) => siblingData?.layout === 'split',
              },
              options: [
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ],
            },
            {
              name: 'mediaFill',
              label: 'Media fill',
              type: 'radio',
              defaultValue: 'contained',
              admin: {
                condition: (_, siblingData) => siblingData?.layout === 'split',
              },
              options: [
                { label: 'Contained', value: 'contained' },
                { label: 'Stretch', value: 'stretch' },
                { label: 'Full-bleed', value: 'fullBleed' },
              ],
            },
            {
              name: 'align',
              label: 'Text alignment',
              type: 'radio',
              defaultValue: 'left',
              admin: {
                condition: (_, siblingData) =>
                  siblingData?.layout === 'textOnly' ||
                  siblingData?.layout === 'split' ||
                  siblingData?.layout === 'backgroundImage',
              },
              options: [
                { label: 'Center', value: 'center' },
                { label: 'Left', value: 'left' },
                { label: 'Right', value: 'right' },
              ],
            },
            {
              name: 'overlayCoverage',
              label: 'Overlay coverage',
              type: 'radio',
              defaultValue: 'full',
              admin: {
                // Split's media is its own half, never underneath the text,
                // so "text area only" has no equivalent there - Media
                // Background stays the only layout with a coverage choice.
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
                condition: (_, siblingData) =>
                  siblingData?.layout === 'backgroundImage' ||
                  (siblingData?.layout === 'split' && siblingData?.mediaFill === 'fullBleed'),
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
                condition: (_, siblingData) =>
                  siblingData?.layout === 'backgroundImage' ||
                  (siblingData?.layout === 'split' && siblingData?.mediaFill === 'fullBleed'),
              },
              options: [
                { label: 'None', value: 'none' },
                { label: 'Light', value: 'light' },
                { label: 'Medium', value: 'medium' },
                { label: 'Strong', value: 'strong' },
                { label: 'Solid', value: 'solid' },
              ],
            },
            ...appearanceField(
              (_, siblingData) => siblingData?.layout !== 'backgroundImage',
            ),
          ],
        },
      ],
    },
  ],
}
