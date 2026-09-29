import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const Table: Block = {
  slug: 'table',
  interfaceName: 'TableBlock',
  labels: { singular: 'Table', plural: 'Tables' },
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
              admin: {
                className: 'field-label--sidebar-badge',
              },
            },
            {
              name: 'rows',
              type: 'array',
              minRows: 1,
              required: true,
              labels: { singular: 'Row', plural: 'Rows' },
              admin: {
                className: 'field-label--sidebar-badge',
                description:
                  'Keep the same number of cells in every row - columns are not enforced automatically.',
              },
              fields: [
                {
                  name: 'cells',
                  type: 'array',
                  minRows: 1,
                  required: true,
                  labels: { singular: 'Cell', plural: 'Cells' },
                  admin: {
                    className: 'ui-table-cells-field',
                    components: {
                      afterInput: ['@/custom/table/Component.tsx#TableCellsStyle'],
                    },
                  },
                  fields: [
                    {
                      name: 'content',
                      type: 'richText',
                      required: true,
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
            ...appearanceField(undefined, 'field-label--sidebar-badge'),
            {
              name: 'hasHeaderRow',
              type: 'checkbox',
              defaultValue: true,
              label: 'First row is a header',
              admin: {
                description: 'Style the first row as column headings instead of a normal row.',
              },
            },
          ],
        },
      ],
    },
  ],
}
