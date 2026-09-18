import { PaginatedDocs } from 'payload'
import { Card } from '@/components/Card'
import { CardContainer } from '@/components/CardContainer'
import { CategoryFilter } from '@/components/CategoryFilter'
import { Pagination, SearchParamsProps } from '@/components/Pagination'
import { Section, Container, Heading, Stack } from '@/components/primitives'
import { useEditableField } from '@/utilities/useEditableField'
import type { BlogListingBlock, Category, Post } from '@/payload-types'

/**
 * Prop-driven, not self-fetching - see current-feature.md's Data/contracts.
 * `categories`/`blogs`/`currentPage`/`categoryParam`/`searchParams` are
 * computed by blog/page.tsx exactly as before this feature. Visibility is
 * gated on the *unfiltered* `blogs.docs.length` (not the count after
 * excluding featured posts) - preserves the existing exact behavior.
 */
export function BlogListing(
  props: BlogListingBlock & {
    categories: PaginatedDocs<Category>
    blogs: PaginatedDocs<Post>
    currentPage: number
    categoryParam?: string
    searchParams: SearchParamsProps
  },
) {
  const {
    id,
    surface,
    heading,
    categories,
    blogs,
    currentPage,
    categoryParam,
    searchParams,
  } = props
  const headingField = useEditableField({
    blockId: id,
    fieldPath: 'heading',
    value: heading || 'More Posts',
  })

  if (blogs.docs.length === 0) return null

  return (
    <Section blockId={id} surface={surface ?? 'muted'}>
      <Container>
        <Stack gap="lg">
          <Heading {...headingField.fieldProps}>{headingField.content}</Heading>
          <CategoryFilter categories={categories.docs} currentCategory={categoryParam} />
          <CardContainer>
            {blogs.docs
              .filter((post) => !post.featured)
              .map((post) => <Card {...post} key={post.id} />)}
          </CardContainer>
          <Pagination
            totalPages={blogs.totalPages}
            currentPage={currentPage}
            hasNext={blogs.hasNextPage}
            hasPrev={blogs.hasPrevPage}
            searchParams={searchParams}
          />
        </Stack>
      </Container>
    </Section>
  )
}
