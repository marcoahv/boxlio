import type { Category, Media, Post, User } from '@/payload-types'
import Link from 'next/link'
import { isDoc } from '@/utilities/isDoc'
import { MediaImage } from '@/components/MediaImage'
import { Heading, type HeadingProps } from '@/components/primitives'
import { Calendar, Tag, User2 } from 'lucide-react'
import type { CardVariant } from '@/components/CardContainer'

type CardProps = Pick<
  Post,
  'id' | 'slug' | 'featuredImage' | 'title' | 'populatedAuthor' | 'date' | 'date_tz' | 'category'
> & {
  variant?: CardVariant
  className?: string
  /** Visual size for the title, when a caller needs it smaller than the card's semantic h3 (e.g. a related-posts rail). */
  titleSize?: HeadingProps['size']
}

export const Card = ({ variant = 'default', className, titleSize, ...post }: CardProps) => {
  const cardClasses = ['card', `card--${variant}`, className].filter(Boolean).join(' ')
  return (
    <Link className={cardClasses} href={'/blog/' + post.slug}>
      <article>
        {isDoc<Media>(post.featuredImage) && (
          <div className="card__image">
            {variant === 'default' && isDoc<Category>(post.category) && (
              <span className="card__category-badge">
                <Tag width={16} height={16} /> {post.category.name}
              </span>
            )}
            <MediaImage image={post.featuredImage} size={'card'} />
          </div>
        )}
        <div className="card__content">
          <Heading level={3} size={titleSize}>{post.title}</Heading>
          <div className="card__meta">
            {isDoc<User>(post.populatedAuthor) && (
              <span className="card__meta-item">
                <User2 height={16} width={16} /> {post.populatedAuthor.name}
              </span>
            )}
            {post.date && (
              <span className="card__meta-item">
                <Calendar height={16} width={16} />
                {new Date(post.date).toLocaleString('en-US', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  timeZone: post.date_tz,
                })}
              </span>
            )}
          </div>
        </div>
      </article>
    </Link>
  )
}
