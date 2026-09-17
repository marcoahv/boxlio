import type { Block } from 'payload'
import { appearanceField } from '@/fields/appearance'
import { editAccordionField } from '@/fields/editAccordion'

/**
 * Blog-only, not part of the shared block registry (src/blocks/registry.ts) -
 * see current-feature.md's Goal for why. Renders whichever post the page's
 * own query already determined is "featured" or "latest"; not
 * editor-configurable beyond appearance.
 *
 * Sitting outside the registry means it doesn't get the shared "Edit"
 * accordion automatically, so it's applied explicitly here.
 */
export const FeaturedPost: Block = {
  slug: 'featuredPost',
  interfaceName: 'FeaturedPostBlock',
  labels: { singular: 'Featured Post', plural: 'Featured Posts' },
  fields: editAccordionField([...appearanceField()]),
}
