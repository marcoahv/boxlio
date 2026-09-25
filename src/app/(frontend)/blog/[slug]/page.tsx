import { getPayload, PaginatedDocs } from 'payload'
import config from '@/payload.config'
import { notFound } from 'next/navigation'
import { isDoc } from '@/utilities/isDoc'
import type { Category, Post } from '@/payload-types'
import { Card } from '@/components/Card'
import { CardContainer } from '@/components/CardContainer'
import { Section, Container, Heading } from '@/components/primitives'
import { PostNavigation } from '@/components/PostNavigation'
import { Metadata } from 'next'
import { generateArticleMeta } from '@/utilities/generateArticleMeta'
import { unstable_cache } from 'next/cache'
import { getPayloadClient } from '@/utilities/getPayloadClient'
import { getCachedGlobal } from '@/utilities/getGlobals'
import { PostClient } from './PostClient'

interface PageProps {
  params: Promise<{ slug: string }>
}

export async function generateStaticParams() {
  const payloadConfig = await config
  const payload = await getPayload({ config: payloadConfig })
  const { docs } = await payload.find({
    collection: 'posts',
    limit: 0,
  })
  return docs.map((doc) => ({ slug: doc.slug }))
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params
  const post = await queryPost({ slug })
  if (!post) {
    return { title: 'Post not found' }
  }
  const settings = await getCachedGlobal('settings')()
  return generateArticleMeta({ post, settings })
}

export default async function Page({ params }: PageProps) {
  const { slug } = await params

  const post = await queryPost({ slug })
  if (!post) return notFound()

  const [relatedPosts, nextPost, prevPost] = await Promise.all([
    queryRelatedPosts({ post }),
    queryNextPost({ post }),
    queryPreviousPost({ post }),
  ])

  return (
    <>
      <PostClient initialData={post} />
      <PostNavigation prevPost={prevPost} nextPost={nextPost} />
      {relatedPosts.docs.length > 0 && (
        <Section surface="muted">
          <Container className="ui-section-container">
            <Heading>Related Posts</Heading>
            <CardContainer>
              {relatedPosts.docs.map((related) => (
                <Card {...related} key={related.id} />
              ))}
            </CardContainer>
          </Container>
        </Section>
      )}
    </>
  )
}

function categoryId(category: Post['category']): string | null {
  if (!category) return null
  return isDoc<Category>(category) ? category.id : category
}

const queryPost = ({ slug }: { slug: string }) =>
  (
    unstable_cache(
      async () => {
        const payload = await getPayloadClient()
        const post = await payload.find({
          collection: 'posts',
          limit: 1,
          where: {
            slug: {
              equals: slug,
            },
          },
          populate: {
            categories: {
              name: true,
              slug: true,
            },
            media: {
              sizes: {
                fullSize: true,
              },
              height: true,
              width: true,
              blurDataUrl: true,
              url: true,
              filename: true,
            },
          },
          select: {
            updatedAt: false,
            generateSlug: false,
          },
        })
        return post.docs?.[0] || null
      },
      ['post-by-slug', slug],
      { tags: ['blog'] },
    ) as () => Promise<Post | null>
  )()

const queryRelatedPosts = ({
  post,
}: {
  post: Pick<Post, 'id' | 'slug' | 'category'>
}) =>
  (
    unstable_cache(
      async () => {
        const payload = await getPayloadClient()
        return await payload.find({
          collection: 'posts',
          limit: 4,
          where: {
            slug: {
              not_equals: post.slug,
            },
            category: {
              equals: categoryId(post.category),
            },
          },
          populate: {
            categories: {
              name: true,
              slug: true,
            },
            media: {
              sizes: {
                card: true,
              },
              height: true,
              width: true,
              blurDataUrl: true,
              url: true,
              filename: true,
            },
          },
          select: {
            createdAt: false,
            updatedAt: false,
            generateSlug: false,
          },
          sort: '-date',
        })
      },
      ['related-posts', post.id],
      { tags: ['blog'] },
    ) as unknown as () => Promise<PaginatedDocs<Post>>
  )()

const queryPreviousPost = ({
  post,
}: {
  post: Pick<Post, 'id' | 'slug' | 'date' | 'createdAt'>
}) =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const prevPost = await payload.find({
        collection: 'posts',
        limit: 1,
        where: {
          slug: {
            not_equals: post.slug,
          },
          or: [
            {
              date: {
                less_than: post.date,
              },
            },
            {
              and: [
                {
                  date: {
                    equals: post.date,
                  },
                },
                {
                  createdAt: {
                    less_than: post.createdAt,
                  },
                },
              ],
            },
          ],
        },
        sort: ['-date', '-createdAt'],
        select: {
          slug: true,
          title: true,
        },
      })
      return (
        (prevPost.docs?.[0] as
          Pick<Post, 'slug' | 'title'> | undefined) || null
      )
    },
    ['previous-post', post.id],
    { tags: ['blog'] },
  )()

const queryNextPost = ({
  post,
}: {
  post: Pick<Post, 'id' | 'slug' | 'date' | 'createdAt'>
}) =>
  unstable_cache(
    async () => {
      const payload = await getPayloadClient()
      const nextPost = await payload.find({
        collection: 'posts',
        limit: 1,
        where: {
          slug: {
            not_equals: post.slug,
          },
          or: [
            {
              date: {
                greater_than: post.date,
              },
            },
            {
              and: [
                {
                  date: {
                    equals: post.date,
                  },
                },
                {
                  createdAt: {
                    greater_than: post.createdAt,
                  },
                },
              ],
            },
          ],
        },
        sort: ['date', 'createdAt'],
        select: {
          slug: true,
          title: true,
        },
      })
      return (
        (nextPost.docs?.[0] as
          Pick<Post, 'slug' | 'title'> | undefined) || null
      )
    },
    ['next-post', post.id],
    { tags: ['blog'] },
  )()
