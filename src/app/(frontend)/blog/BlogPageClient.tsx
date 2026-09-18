'use client'

import { PaginatedDocs } from 'payload'
import { Blocks } from '@/blocks'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { useBlockSyncListener } from '@/utilities/useBlockSyncListener'
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

  return (
    <>
      <Blocks blocks={data.blocks} />
      {data.blogBlocks?.map((block, index) => {
        if (block.blockType === 'featuredPost') {
          return (
            <div key={block.id ?? index} data-block-id={block.id ?? undefined}>
              <FeaturedPost {...block} heroPost={heroPost} featuredBlog={featuredBlog} />
            </div>
          )
        }
        if (block.blockType === 'blogListing') {
          return (
            <div key={block.id ?? index} data-block-id={block.id ?? undefined}>
              <BlogListing
                {...block}
                categories={categories}
                blogs={blogs}
                currentPage={currentPage}
                categoryParam={categoryParam}
                searchParams={searchParams}
              />
            </div>
          )
        }
        return null
      })}
    </>
  )
}
