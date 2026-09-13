import { type BlockSlug, type CollectionConfig, slugField } from 'payload'
import { Post } from '@/payload-types'
import {
  BlocksFeature,
  FixedToolbarFeature,
  lexicalEditor,
} from '@payloadcms/richtext-lexical'
import { populateAuthor } from '@/collections/Posts/hooks/populateAuthor'
import { SEOField } from '@/fields/seo/config'
import { appearanceField, breadcrumbsField } from '@/fields/appearance'
import { blockSlugs } from '@/blocks/registry'
import {
  deletePost,
  updatePost,
} from '@/collections/Posts/hooks/revalidatePost'

export const Posts: CollectionConfig = {
  slug: 'posts',
  defaultPopulate: {
    slug: true,
    title: true,
  },
  admin: {
    useAsTitle: 'title',
    hideAPIURL: process.env.NODE_ENV !== 'development',
  },
  hooks: {
    afterRead: [populateAuthor],
    afterChange: [updatePost],
    afterDelete: [deletePost],
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  fields: [
    slugField(),
    {
      type: 'tabs',
      tabs: [
        {
          label: 'Information',
          fields: [
            {
              type: 'text',
              name: 'title',
              required: true,
            },
            {
              type: 'textarea',
              name: 'summary',
            },
            {
              type: 'checkbox',
              name: 'featured',
              admin: {
                components: {
                  Error: '@/custom/error/Component.tsx#CheckboxError',
                },
              },
              label: 'Make Featured Post',
              validate: async (
                value,
                { req: { payload }, siblingData },
              ) => {
                const { totalDocs } = await payload.count({
                  collection: 'posts',
                  where: {
                    featured: {
                      equals: true,
                    },
                    slug: {
                      not_equals: (siblingData as Post).slug,
                    },
                  },
                })
                if (totalDocs && value === true) {
                  return 'Only one featured post is allowed'
                }
                return true
              },
            },
            {
              type: 'relationship',
              name: 'author',
              relationTo: 'users',
              required: true,
            },
            {
              type: 'relationship',
              name: 'category',
              relationTo: 'categories',
            },
            {
              type: 'date',
              name: 'date',
              admin: {
                date: {
                  pickerAppearance: 'dayAndTime',
                },
              },
              timezone: {
                supportedTimezones: [
                  { value: 'America/New_York', label: 'East Coast' },
                ],
                defaultTimezone: 'America/New_York',
              },
            },

            {
              type: 'group',
              name: 'populatedAuthor',
              fields: [
                { type: 'text', name: 'id' },
                { type: 'text', name: 'name' },
              ],
              admin: { hidden: true, disabled: true },
              access: {
                update: () => false,
              },
              virtual: true,
            },
            {
              type: 'upload',
              name: 'featuredImage',
              relationTo: 'media',
              required: true,
            },
          ],
        },
        {
          label: 'Appearance',
          fields: [
            {
              type: 'group',
              name: 'breadcrumbs',
              label: 'Breadcrumbs',
              admin: {
                description: 'The Home / Blog / post-title trail above the post.',
              },
              fields: breadcrumbsField(),
            },
            {
              type: 'group',
              name: 'headerAppearance',
              label: 'Hero section',
              admin: {
                description: 'The title, meta row, and banner image at the top of the post.',
              },
              fields: appearanceField(),
            },
            {
              type: 'group',
              name: 'bodyAppearance',
              label: 'Body section',
              admin: {
                description: 'The rich text content below the header.',
              },
              fields: appearanceField(),
            },
          ],
        },
        {
          label: 'Content',
          fields: [
            {
              type: 'richText',
              name: 'body',
              required: true,
              editor: lexicalEditor({
                features: ({ defaultFeatures }) => [
                  ...defaultFeatures,
                  FixedToolbarFeature(),
                  // Derived from the registry, so blocks stay available
                  // inside post bodies without a second list to maintain.
                  BlocksFeature({
                    blocks: blockSlugs as BlockSlug[],
                  }),
                ],
              }),
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
