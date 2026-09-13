import { Category, Media, Post, User } from '@/payload-types'
import { isDoc } from '@/utilities/isDoc'
import { MediaImage } from '@/components/MediaImage'
import { Heading } from '@/components/primitives'
import { Calendar, Tag, User2 } from 'lucide-react'
import Link from 'next/link'

type PostPreviewProps = {
  post: Pick<
    Post,
    | 'id'
    | 'slug'
    | 'title'
    | 'summary'
    | 'featuredImage'
    | 'populatedAuthor'
    | 'date'
    | 'date_tz'
    | 'category'
  >
  variant?: 'featured' | 'header'
  showLink?: boolean
  imageSize?: 'thumbnail' | 'fullSize' | 'card'
  className?: string
}

export function PostPreview({
  post,
  variant = 'featured',
  showLink = true,
  imageSize = 'fullSize',
  className,
}: PostPreviewProps) {
  const {
    featuredImage,
    populatedAuthor: author,
    date,
    date_tz,
    category,
    title,
    summary,
    slug,
  } = post
  const classNames = ['post-preview', className].filter(Boolean).join(' ')

  const content = (
    <div className={classNames}>
      {isDoc<Media>(featuredImage) && <MediaImage image={featuredImage} size={imageSize} />}
      <div className="post-preview__content">
        {variant === 'featured' && <Heading level={3}>{title}</Heading>}
        <div className="post-preview__meta">
          {isDoc<User>(author) && (
            <span className="post-preview__meta-item">
              <User2 height={16} width={16} /> {author.name}
            </span>
          )}
          {isDoc<Category>(category) && (
            <span className="post-preview__meta-item">
              <Tag width={16} height={16} /> {category.name}
            </span>
          )}
          {date && (
            <span className="post-preview__meta-item">
              <Calendar width={16} height={16} />
              {new Date(date).toLocaleString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: date_tz,
              })}
            </span>
          )}
        </div>
        {summary && <p className="post-preview__summary">{summary}</p>}
      </div>
    </div>
  )

  if (showLink) {
    return (
      <Link href={`/blog/${slug}`} className="post-preview__link">
        {content}
      </Link>
    )
  }

  return content
}
