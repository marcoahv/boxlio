import type { Field, Option } from 'payload'

/**
 * Shared option lists.
 *
 * Exported so every appearance control in the project draws from the same
 * vocabulary. A new surface added here reaches blocks and the header at once,
 * rather than being added twice and drifting.
 */

export const SURFACE_OPTIONS: Option[] = [
  { label: 'Default', value: 'default' },
  { label: 'Inverse', value: 'inverse' },
  { label: 'Primary color', value: 'muted' },
  { label: 'Secondary color', value: 'accent' },
]

export const SPACING_OPTIONS: Option[] = [
  { label: 'None', value: 'none' },
  { label: 'Tight', value: 'tight' },
  { label: 'Normal', value: 'normal' },
  { label: 'Loose', value: 'loose' },
]

export const WIDTH_OPTIONS: Option[] = [
  { label: 'Narrow', value: 'narrow' },
  { label: 'Default', value: 'default' },
  { label: 'Wide', value: 'wide' },
  { label: 'Full bleed', value: 'full' },
]

/**
 * The shared look-and-feel controls every block exposes.
 *
 * Deliberately constrained: editors pick semantic ROLES, never colors or
 * pixel values. `surface: 'muted'` resolves through the token system, so it
 * stays on-brand after a palette change and carries its own matching text
 * color. Off-brand pages are unrepresentable by construction.
 *
 * Values map 1:1 onto the <Section> primitive's props.
 *
 * Usage:
 *   fields: [ ...appearanceField(), { name: 'heading', type: 'text' } ]
 */
export const appearanceField = (): Field[] => [
  {
    type: 'collapsible',
    label: 'Appearance',
    admin: {
      initCollapsed: true,
      description: 'How this section sits on the page.',
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'surface',
            type: 'select',
            defaultValue: 'default',
            admin: { width: '33%' },
            options: SURFACE_OPTIONS,
          },
          {
            name: 'spacing',
            type: 'select',
            defaultValue: 'normal',
            admin: { width: '33%' },
            options: SPACING_OPTIONS,
          },
          {
            name: 'width',
            type: 'select',
            defaultValue: 'default',
            admin: { width: '33%' },
            options: WIDTH_OPTIONS,
          },
        ],
      },
    ],
  },
]

/**
 * Appearance controls for the header.
 *
 * Shares `surface` and `width` with blocks, but swaps `spacing` — a header has
 * a bar height, not section padding — and adds the two controls only a header
 * needs: how it scrolls, and whether it starts transparent over the first
 * block.
 */
export const headerAppearanceField = (): Field[] => [
  {
    type: 'collapsible',
    label: 'Appearance',
    admin: {
      initCollapsed: true,
      description: 'How the header looks and behaves as the page scrolls.',
    },
    fields: [
      {
        type: 'row',
        fields: [
          {
            name: 'surface',
            type: 'select',
            defaultValue: 'default',
            admin: {
              width: '50%',
              description: 'Background, and the matching text color.',
            },
            options: SURFACE_OPTIONS,
          },
          {
            name: 'width',
            type: 'select',
            defaultValue: 'default',
            admin: { width: '50%', description: 'How wide the bar contents run.' },
            options: WIDTH_OPTIONS,
          },
        ],
      },
      {
        type: 'row',
        fields: [
          {
            name: 'position',
            type: 'select',
            defaultValue: 'fixed',
            admin: {
              width: '50%',
              description:
                'Fixed stays in view while the page scrolls. Static scrolls away with the rest of the page.',
            },
            options: [
              { label: 'Fixed', value: 'fixed' },
              { label: 'Static', value: 'static' },
            ],
          },
          {
            name: 'height',
            type: 'select',
            defaultValue: 'normal',
            admin: {
              width: '50%',
              description: 'How tall the header bar is.',
            },
            options: [
              { label: 'Compact', value: 'compact' },
              { label: 'Normal', value: 'normal' },
              { label: 'Tall', value: 'tall' },
            ],
          },
        ],
      },
      {
        name: 'transparentAtTop',
        type: 'checkbox',
        defaultValue: true,
        admin: {
          description:
            'Start transparent so the first block shows through, then fade to the surface on scroll. Pick a surface whose text color reads against that block.',
        },
      },
      {
        name: 'showThemeToggle',
        type: 'checkbox',
        defaultValue: true,
        admin: {
          description:
            "Let visitors manually switch between light and dark mode from the header. When off, the site still follows each visitor's device setting automatically.",
        },
      },
    ],
  },
]

/**
 * Show/hide plus appearance for a post's breadcrumb trail.
 *
 * Defaults (`muted`/`tight`) deliberately don't match `appearanceField()`'s
 * (`default`/`normal`) - they match what the breadcrumb trail already looks
 * like today, so an existing post with no stored value renders identically
 * to before this field existed, and a new post's form matches that same look.
 */
export const breadcrumbsField = (): Field[] => [
  {
    type: 'collapsible',
    label: 'Appearance',
    admin: {
      initCollapsed: true,
      description: 'Whether the breadcrumb trail shows above this post, and how it looks.',
    },
    fields: [
      {
        name: 'show',
        type: 'checkbox',
        defaultValue: true,
        label: 'Show breadcrumbs',
      },
      {
        type: 'row',
        fields: [
          {
            name: 'surface',
            type: 'select',
            defaultValue: 'muted',
            admin: { width: '33%' },
            options: SURFACE_OPTIONS,
          },
          {
            name: 'spacing',
            type: 'select',
            defaultValue: 'tight',
            admin: { width: '33%' },
            options: SPACING_OPTIONS,
          },
          {
            name: 'width',
            type: 'select',
            defaultValue: 'default',
            admin: { width: '33%' },
            options: WIDTH_OPTIONS,
          },
        ],
      },
    ],
  },
]
