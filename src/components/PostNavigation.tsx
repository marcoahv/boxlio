import { Container } from '@/components/primitives'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'

type PostLink = {
  slug: string
  title: string
} | null

type PostNavigationProps = {
  prevPost: PostLink
  nextPost: PostLink
}

export function PostNavigation({ prevPost, nextPost }: PostNavigationProps) {
  if (!prevPost && !nextPost) return null

  return (
    <nav className="post-navigation" aria-label="Post navigation">
      <Container className="ui-section-container">
        <div className="post-navigation__inner">
          {prevPost ? (
            <Link
              href={`/blog/${prevPost.slug}`}
              className="post-navigation__link post-navigation__link--prev"
              aria-label={`Previous post: ${prevPost.title}`}
            >
              <ChevronLeft size={16} aria-hidden="true" />
              <span className="post-navigation__link-content">
                <span className="post-navigation__label">Previous Post</span>
                <span className="post-navigation__title">{prevPost.title}</span>
              </span>
            </Link>
          ) : (
            <span />
          )}
          {nextPost ? (
            <Link
              href={`/blog/${nextPost.slug}`}
              className="post-navigation__link post-navigation__link--next"
              aria-label={`Next post: ${nextPost.title}`}
            >
              <span className="post-navigation__link-content">
                <span className="post-navigation__label">Next Post</span>
                <span className="post-navigation__title">{nextPost.title}</span>
              </span>
              <ChevronRight size={16} aria-hidden="true" />
            </Link>
          ) : (
            <span />
          )}
        </div>
      </Container>
    </nav>
  )
}
