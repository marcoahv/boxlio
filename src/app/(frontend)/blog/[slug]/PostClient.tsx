'use client'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { RichText } from '@/components/RichText'
import { Section, Container, Heading, Stack } from '@/components/primitives'
import { PostPreview } from '@/components/PostPreview'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import type { Post } from '@/payload-types'

/**
 * Renders the parts of the post detail page that depend on the post's own
 * fields, including breadcrumbs (moved in from page.tsx so the trail and its
 * show/appearance controls react live, same as headerAppearance/
 * bodyAppearance below). PostNavigation and related posts stay
 * server-rendered in page.tsx - they're derived from OTHER documents, not
 * this one, so there's nothing on them to live-update.
 */
export function PostClient({ initialData }: { initialData: Post }) {
  const data = useScopedLivePreview<Post>({
    target: { type: 'collection', collectionSlug: 'posts' },
    initialData,
    serverURL: getServerSideURL(),
    depth: 2,
  })

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: data.title },
  ]

  return (
    <>
      {data.breadcrumbs?.show !== false && (
        <Breadcrumbs
          items={breadcrumbs}
          surface={data.breadcrumbs?.surface}
          spacing={data.breadcrumbs?.spacing}
          width={data.breadcrumbs?.width}
        />
      )}
      <Section surface={data.headerAppearance?.surface} spacing={data.headerAppearance?.spacing}>
        <Container width={data.headerAppearance?.width}>
          <Stack gap="lg">
            <Heading level={1}>{data.title}</Heading>
            <PostPreview post={data} variant="header" showLink={false} imageSize="thumbnail" />
          </Stack>
        </Container>
      </Section>
      <Section surface={data.bodyAppearance?.surface} spacing={data.bodyAppearance?.spacing}>
        <Container width={data.bodyAppearance?.width}>
          <div className="ui-prose">
            <RichText data={data.body} />
          </div>
        </Container>
      </Section>
    </>
  )
}
