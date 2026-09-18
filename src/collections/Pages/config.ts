import {
  type BlockSlug,
  type CollectionConfig,
  slugField,
} from 'payload'
import { SEOField } from '@/fields/seo/config'
import { blockSlugs } from '@/blocks/registry'
import { FeaturedPost } from './blogBlocks/FeaturedPost/config'
import { BlogListing } from './blogBlocks/BlogListing/config'
import { deletePage, updatePage } from './hooks/revalidatePage'

export const Pages: CollectionConfig = {
  slug: 'pages',
  defaultPopulate: {
    slug: true,
    title: true,
  },
  admin: {
    useAsTitle: 'title',
    group: 'Content',
  },
  hooks: {
    afterChange: [updatePage],
    afterDelete: [deletePage],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Information',
          fields: [
            {
              type: 'row',
              fields: [
                {
                  name: 'updatedAt',
                  type: 'date',
                  label: 'Last Modified',
                  index: true,
                  admin: {
                    readOnly: true,
                    disableBulkEdit: true,
                    className: 'admin-timestamp-field',
                    date: { pickerAppearance: 'dayAndTime' },
                  },
                },
                {
                  name: 'createdAt',
                  type: 'date',
                  label: 'Created',
                  index: true,
                  admin: {
                    readOnly: true,
                    disableBulkEdit: true,
                    className: 'admin-timestamp-field',
                    date: { pickerAppearance: 'dayAndTime' },
                  },
                },
              ],
            },
            {
              type: 'collapsible',
              label: 'Edit',
              admin: {
                initCollapsed: true,
                className: 'info-tab-edit-collapsible',
              },
              fields: [
                {
                  name: 'informationTabEditAutoCollapse',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '@/custom/information-tab-edit-autocollapse/Component.tsx#InformationTabEditAutoCollapse',
                    },
                  },
                },
                {
                  name: 'informationTabSave',
                  type: 'ui',
                  admin: {
                    components: {
                      Field: '@/custom/information-tab-save/Component.tsx#InformationTabSaveButton',
                    },
                  },
                },
                {
                  type: 'text',
                  name: 'title',
                  required: true,
                },
                slugField({
                  overrides: (field) => {
                    field.admin = {}
                    return field
                  },
                }),
                {
                  type: 'upload',
                  name: 'featuredImage',
                  relationTo: 'media',
                  required: true,
                },
              ],
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              name: 'blocks',
              type: 'blocks',
              // Derived from the registry, so a newly registered block becomes
              // available here automatically. Blocks are defined once in
              // payload.config.ts and referenced by slug.
              blockReferences: blockSlugs as BlockSlug[],
              blocks: [],
            },
            {
              name: 'blockHoverSync',
              type: 'ui',
              admin: {
                // Top-level, not nested inside `blocks`/`blogBlocks`, so it
                // mounts immediately regardless of which block rows are
                // collapsed - see the component's own comment for why.
                components: {
                  Field: '@/custom/block-hover-sync/Component.tsx#BlockHoverSync',
                },
              },
            },
          ],
        },
        {
          label: 'Blog Blocks',
          admin: {
            // Only the "blog" page reads blogBlocks (see blog/page.tsx) —
            // hide the whole tab everywhere else rather than leave editors
            // staring at an empty one.
            condition: (data) => data?.slug === 'blog',
          },
          fields: [
            {
              name: 'blogBlocks',
              label: 'Blog Blocks',
              type: 'blocks',
              blocks: [FeaturedPost, BlogListing],
              admin: {
                description:
                  'Add, reorder, or omit Featured Post and Blog Listing. Add a Hero block (Content tab) above them for a heading.',
              },
            },
          ],
        },
        {
          label: 'SEO',
          fields: [SEOField],
        },
      ],
    },
  ],
}
