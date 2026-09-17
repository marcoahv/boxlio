import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'
import { editAccordionField } from '@/fields/editAccordion'

/**
 * Blog-only, not part of the shared block registry (src/blocks/registry.ts) -
 * see current-feature.md's Goal for why. Renders the paginated,
 * category-filterable grid of non-featured posts from the page's own query.
 *
 * Sitting outside the registry means it doesn't get the shared "Edit"
 * accordion automatically, so it's applied explicitly here.
 */
export const BlogListing: Block = {
  slug: 'blogListing',
  interfaceName: 'BlogListingBlock',
  labels: { singular: 'Blog Listing', plural: 'Blog Listings' },
  fields: editAccordionField([
    ...appearanceField(),
    {
      name: 'heading',
      type: 'text',
      defaultValue: 'More Posts',
    },
  ]),
}
