import type { Field } from 'payload'

/**
 * Wraps a block's own fields in the same custom "Edit" accordion already
 * shipped for the Information tab (Pages/Posts): collapsed by default,
 * auto-collapses when idle, nudges instead of losing unsaved work, blocks
 * tab-switching while unsaved, an in-accordion Save button, and a
 * secondary-color border - all via the same `info-tab-edit-collapsible`
 * class and the same two components, so no new CSS is needed.
 *
 * `skipForcedCollapseIfFresh: true` is block-specific: a block added in the
 * current session should stay open until you leave it, not auto-hide itself
 * moments after you add it (see `InformationTabEditAutoCollapse`).
 *
 * Usage: `fields: editAccordionField([...appearanceField(), { name: 'heading', type: 'text' }])`
 */
export const editAccordionField = (fields: Field[]): Field[] => [
  {
    type: 'collapsible',
    label: 'Edit',
    admin: {
      initCollapsed: true,
      // `info-tab-edit-collapsible` is required so InformationTabEditAutoCollapse
      // can find its own wrapper via closest(); `block-edit-collapsible`
      // excludes this from the Information tab's secondary-color border
      // (see admin-timestamps/styles.css) - blocks get that color on their
      // own outer row instead.
      className: 'info-tab-edit-collapsible block-edit-collapsible',
      components: {
        // Reactive "Edit"/"Done" label, centered - the static `label` below
        // stays as the fallback/translation source `RowLabel` uses when no
        // custom component is given; it's otherwise inert once this is set.
        Label: '@/custom/block-edit-label/Component.tsx#BlockEditLabel',
      },
    },
    fields: [
      {
        name: 'blockEditAutoCollapse',
        type: 'ui',
        admin: {
          components: {
            Field: {
              path: '@/custom/information-tab-edit-autocollapse/Component.tsx',
              exportName: 'InformationTabEditAutoCollapse',
              clientProps: {
                skipForcedCollapseIfFresh: true,
              },
            },
          },
        },
      },
      {
        name: 'blockEditSave',
        type: 'ui',
        admin: {
          components: {
            Field: '@/custom/information-tab-save/Component.tsx#InformationTabSaveButton',
          },
        },
      },
      ...fields,
    ],
  },
]
