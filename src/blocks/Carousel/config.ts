import type { Block, Field } from 'payload'
import { appearanceField, WIDTH_OPTIONS } from '@/fields/appearance'

/**
 * Every slide's own content fields, mirroring the content half of Hero
 * (`src/blocks/Hero/config.ts`) - heading, subheading, media, buttons.
 * Layout (Text-only/Split/Media Background, alignment, overlay, ...) is
 * NOT per slide - it lives once on the block itself (see `Carousel.fields`
 * below) and applies to every slide alike. `mediaType`/`image`/`video`
 * still read that shared layout to decide what to show, via the
 * condition's `blockData` argument (the nearest parent block's data)
 * instead of this row's own `siblingData`, since `layout` isn't a sibling
 * of these fields anymore. Kept as its own function (not imported from
 * Hero's own file) so Hero's config stays untouched and this block can't
 * accidentally regress it - a deliberate, flagged duplication rather than
 * a shared-component refactor; see current-feature.md's Notes for the AI.
 */
const slideFields = (): Field[] => [
  {
    name: 'heading',
    type: 'text',
    required: true,
    admin: {
      className: 'field-label--sidebar-badge',
    },
  },
  {
    name: 'subheading',
    type: 'textarea',
    admin: {
      className: 'field-label--sidebar-badge',
    },
  },
  {
    name: 'mediaType',
    label: 'Media type',
    type: 'radio',
    defaultValue: 'image',
    admin: {
      className: 'field-label--sidebar-badge',
      condition: (_, __, { blockData }) =>
        blockData?.layout === 'split' || blockData?.layout === 'backgroundImage',
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
      description: 'Shown beside the text (Split) or as a full-bleed background (Media Background).',
      className: 'field-label--sidebar-badge',
      condition: (_, siblingData, { blockData }) =>
        !(
          (blockData?.layout === 'split' || blockData?.layout === 'backgroundImage') &&
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
      className: 'field-label--sidebar-badge',
      condition: (_, siblingData, { blockData }) =>
        (blockData?.layout === 'split' || blockData?.layout === 'backgroundImage') &&
        siblingData?.mediaType === 'video',
    },
  },
  {
    type: 'row',
    admin: {
      condition: (_, siblingData, { blockData }) =>
        blockData?.layout === 'split' && siblingData?.mediaType === 'video',
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
      className: 'hero-buttons-array field-label--sidebar-badge',
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
        admin: {
          className: 'field-row--no-stack',
        },
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
]

/**
 * The Layout tab's fields, shared once by the whole block instead of
 * repeated per slide (see `slideFields()`'s own note on why). Same
 * names/options/defaults as before this fix - only the nesting level
 * changed, so every condition below still reads a true sibling field via
 * `siblingData`, same as it did when these lived on a slide row.
 */
const carouselLayoutFields = (): Field[] => [
  {
    name: 'layout',
    label: 'Type',
    type: 'radio',
    defaultValue: 'split',
    admin: {
      className: 'field-label--sidebar-badge',
    },
    options: [
      { label: 'Text-only', value: 'textOnly' },
      { label: 'Split', value: 'split' },
      { label: 'Media Background', value: 'backgroundImage' },
    ],
  },
  ...appearanceField(
    (_, siblingData) => siblingData?.layout !== 'backgroundImage',
    'field-label--sidebar-badge',
    'radio',
  ),
  {
    name: 'headerPosition',
    label: 'Text position',
    type: 'radio',
    defaultValue: 'left',
    admin: {
      className: 'field-label--sidebar-badge',
      condition: (_, siblingData) => siblingData?.layout === 'split',
    },
    options: [
      { label: 'Left', value: 'left' },
      { label: 'Right', value: 'right' },
    ],
  },
  {
    name: 'align',
    label: 'Text alignment',
    type: 'radio',
    defaultValue: 'left',
    admin: {
      className: 'field-label--sidebar-badge',
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
    name: 'verticalAlign',
    label: 'Vertical text alignment',
    type: 'radio',
    defaultValue: 'center',
    admin: {
      className: 'field-label--sidebar-badge',
    },
    options: [
      { label: 'Top', value: 'top' },
      { label: 'Center', value: 'center' },
      { label: 'Bottom', value: 'bottom' },
    ],
  },
  {
    name: 'mediaFill',
    label: 'Media fill',
    type: 'radio',
    defaultValue: 'contained',
    admin: {
      className: 'field-label--sidebar-badge',
      condition: (_, siblingData) => siblingData?.layout === 'split',
    },
    options: [
      { label: 'Contained', value: 'contained' },
      { label: 'Stretch', value: 'stretch' },
      { label: 'Full-bleed', value: 'fullBleed' },
    ],
  },
  {
    name: 'overlayCoverage',
    label: 'Overlay coverage',
    type: 'radio',
    defaultValue: 'full',
    admin: {
      className: 'field-label--sidebar-badge',
      condition: (_, siblingData) => siblingData?.layout === 'backgroundImage',
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
      className: 'field-label--sidebar-badge',
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
      className: 'field-label--sidebar-badge',
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
]

export const Carousel: Block = {
  slug: 'carousel',
  interfaceName: 'CarouselBlock',
  labels: { singular: 'Carousel', plural: 'Carousels' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'items',
              type: 'array',
              // A carousel needs something to move between - unlike every
              // sibling array block's `minRows: 1`, a single slide alone is
              // just an image, not a carousel.
              minRows: 2,
              maxRows: 10,
              required: true,
              labels: { singular: 'Slide', plural: 'Slides' },
              admin: {
                className: 'field-label--sidebar-badge',
                components: {
                  RowLabel: {
                    path: '@/custom/label/Component.tsx#HeadingRowLabel',
                    clientProps: { fallbackLabel: 'Slide' },
                  },
                },
              },
              fields: slideFields(),
            },
          ],
        },
        {
          label: 'Layout',
          fields: [
            ...carouselLayoutFields(),
            {
              name: 'transition',
              label: 'Transition',
              type: 'radio',
              defaultValue: 'fade',
              admin: {
                className: 'field-label--sidebar-badge',
                description:
                  'Fade crossfades between slides. Slide pushes the new one in from the side the visitor navigated toward.',
              },
              options: [
                { label: 'Fade', value: 'fade' },
                { label: 'Slide', value: 'slide' },
              ],
            },
            {
              // Every sibling block skips this in favor of the sitewide
              // Settings width (see appearance.ts's own note) - Carousel is
              // the first to need its own override.
              name: 'width',
              type: 'select',
              defaultValue: 'default',
              options: WIDTH_OPTIONS,
              admin: {
                className: 'field-label--sidebar-badge',
              },
            },
            {
              // No `className`: checkboxes are exempt from the sidebar-badge
              // treatment, matching Accordion's `allowMultiple`.
              name: 'autoplay',
              type: 'checkbox',
              defaultValue: false,
              label: 'Autoplay',
              admin: {
                description: 'Automatically advance to the next slide.',
              },
            },
            {
              name: 'autoplayInterval',
              type: 'number',
              defaultValue: 5,
              min: 2,
              max: 30,
              admin: {
                className: 'field-label--sidebar-badge',
                description: 'Seconds each slide stays visible before advancing.',
                condition: (_, siblingData) => Boolean(siblingData?.autoplay),
              },
            },
          ],
        },
      ],
    },
  ],
}
