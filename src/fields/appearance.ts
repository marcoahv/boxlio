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
  { label: 'Default', value: 'normal' },
  { label: 'Loose', value: 'loose' },
]

export const WIDTH_OPTIONS: Option[] = [
  { label: 'Narrow', value: 'narrow' },
  { label: 'Default', value: 'default' },
  { label: 'Wide', value: 'wide' },
  { label: 'Full Screen', value: 'full' },
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
 * No collapsible wrapper - `width`/`spacing` moved to Settings, so `surface`
 * is the only field left here, and a collapsible around a single field adds
 * a click with no grouping benefit.
 *
 * Usage:
 *   fields: [ ...appearanceField(), { name: 'heading', type: 'text' } ]
 */
export const appearanceField = (): Field[] => [
  {
    name: 'surface',
    type: 'select',
    defaultValue: 'default',
    options: SURFACE_OPTIONS,
  },
]

/**
 * Appearance controls for the header.
 *
 * Shares `surface` with blocks. `width`/`height` moved to Settings (see
 * Settings/config.ts's Whitespace tab - Header group) - swaps `spacing` for
 * `height` in that move, same as it always did, a header has a bar height,
 * not section padding. Still adds the two controls only a header needs: how
 * it scrolls, and whether it starts transparent over the first block.
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
        name: 'surface',
        type: 'select',
        defaultValue: 'default',
        admin: {
          description: 'Background, and the matching text color.',
        },
        options: SURFACE_OPTIONS,
      },
      {
        name: 'position',
        type: 'select',
        defaultValue: 'fixed',
        admin: {
          description:
            'Fixed stays in view while the page scrolls. Static scrolls away with the rest of the page.',
        },
        options: [
          { label: 'Fixed', value: 'fixed' },
          { label: 'Static', value: 'static' },
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
        name: 'surface',
        type: 'select',
        defaultValue: 'muted',
        options: SURFACE_OPTIONS,
      },
    ],
  },
]
