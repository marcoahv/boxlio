import { isDoc } from '@/utilities/isDoc'
import { PostPreview } from '@/components/PostPreview'
import { Section, Container, Heading, Stack } from '@/components/primitives'
import type { FeaturedPostBlock, Post } from '@/payload-types'

/**
 * Prop-driven, not self-fetching - see current-feature.md's Data/contracts.
 * `heroPost`/`featuredBlog` are computed by blog/page.tsx exactly as before
 * this feature (including the "latest post" fallback's existing coupling to
 * the active category filter - not something this block changes).
 */
export function FeaturedPost(
  props: FeaturedPostBlock & { heroPost: Post | null | undefined; featuredBlog: Post | null },
) {
  const { surface, heroPost, featuredBlog } = props

  if (!isDoc<Post>(heroPost)) return null

  return (
    <Section surface={surface}>
      <Container>
        <Stack gap="md">
          <Heading>{featuredBlog ? 'Featured post' : 'Latest post'}</Heading>
          <PostPreview post={heroPost} imageSize={'fullSize'} />
        </Stack>
      </Container>
    </Section>
  )
}
