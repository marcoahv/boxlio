'use client'

import { PaginatedDocs } from 'payload'
import { Blocks } from '@/blocks'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { useBlockSyncListener } from '@/utilities/useBlockSyncListener'
import { useIsLivePreviewActive } from '@/utilities/useIsLivePreviewActive'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'
import { FeaturedPost } from '@/collections/Pages/blogBlocks/FeaturedPost/Component'
import { BlogListing } from '@/collections/Pages/blogBlocks/BlogListing/Component'
import { SearchParamsProps } from '@/components/Pagination'
import type { Category, Page as PageType, Post } from '@/payload-types'

/**
 * Renders only the parts of the blog listing page that depend on the `blog`
 * Pages document's own fields (`blocks`, `blogBlocks`). `categories`/
 * `heroPost`/`featuredBlog`/`blogs`/pagination are computed by blog/page.tsx
 * from separate Posts/Categories queries at page load - nothing on them to
 * live-update, same as PostClient's related posts/breadcrumbs.
 */
export function BlogPageClient({
  initialData,
  categories,
  heroPost,
  featuredBlog,
  blogs,
  currentPage,
  categoryParam,
  searchParams,
}: {
  initialData: PageType
  categories: PaginatedDocs<Category>
  heroPost: Post | null | undefined
  featuredBlog: Post | null
  blogs: PaginatedDocs<Post>
  currentPage: number
  categoryParam?: string
  searchParams: SearchParamsProps
}) {
  const data = useScopedLivePreview<PageType>({
    target: { type: 'collection', collectionSlug: 'pages' },
    initialData,
    serverURL: getServerSideURL(),
    depth: 2,
  })
  useBlockSyncListener()
  const isEditable = useIsLivePreviewActive({ type: 'collection', collectionSlug: 'pages' })

  return (
    <EditableFieldProvider value={isEditable}>
      <Blocks blocks={data.blocks} />
      {data.blogBlocks?.map((block, index) => {
        // Each block publishes its own `data-block-id` on its root <Section>
        // rather than through a wrapper here - see that primitive's `blockId`
        // prop for why an extra element breaks `.ui-section:first-child`.
        if (block.blockType === 'featuredPost') {
          return (
            <FeaturedPost
              key={block.id ?? index}
              {...block}
              heroPost={heroPost}
              featuredBlog={featuredBlog}
            />
          )
        }
        if (block.blockType === 'blogListing') {
          return (
            <BlogListing
              key={block.id ?? index}
              {...block}
              categories={categories}
              blogs={blogs}
              currentPage={currentPage}
              categoryParam={categoryParam}
              searchParams={searchParams}
            />
          )
        }
        return null
      })}
    </EditableFieldProvider>
  )
}
