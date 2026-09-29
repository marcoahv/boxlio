import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'

export const RichTextBlock: Block = {
  slug: 'richText',
  interfaceName: 'RichTextBlock',
  labels: { singular: 'Rich Text', plural: 'Rich Text' },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Content',
          fields: [
            {
              name: 'content',
              type: 'richText',
              required: true,
              admin: {
                // Hero has no richText-type field, so there's no existing
                // precedent for this badge border against Lexical's toolbar -
                // confirmed visually in feature 31's step 7; keep unless that
                // check finds it clashes.
                className: 'field-label--sidebar-badge',
              },
            },
          ],
        },
        {
          label: 'Layout',
          fields: [...appearanceField(undefined, 'field-label--sidebar-badge')],
        },
      ],
    },
  ],
}
