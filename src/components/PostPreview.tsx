'use client'

import { Category, Media, Post, User } from '@/payload-types'
import { isDoc } from '@/utilities/isDoc'
import { MediaImage } from '@/components/MediaImage'
import { Heading } from '@/components/primitives'
import { useEditableField } from '@/utilities/useEditableField'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'
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
  /**
   * Whether this post's own Information tab fields are click-to-edit in
   * Live Preview right now - true only from `PostClient`'s own `variant="header"`
   * render of its own post. An explicit prop, not read off ambient
   * `EditableFieldContext`: this component also renders inside a Page's own
   * Live Preview (`FeaturedPost`/`BlogListing` blocks), where the ambient
   * context describes the PAGE's block editability, not this post's -
   * reading it directly here would make a different post's summary falsely
   * editable (and silently no-op on edit, since `summary` isn't a field on
   * a Page's form) whenever that page itself is being edited. The prop
   * defaults to `false` so every other call site is unaffected, and
   * `PostSummary` below is wrapped in a fresh provider seeded from it so
   * `useEditableField` never falls through to that ambient value.
   */
  isEditable?: boolean
}

/**
 * Its own component, not inlined in `PostPreview`'s own render - same
 * reasoning as `PostTitle` in `PostClient.tsx`: `useEditableField` needs the
 * provider below to be an actual JSX ancestor, not just called first in the
 * parent's render body.
 */
function PostSummary({ summary }: { summary: string }) {
  const summaryField = useEditableField({
    blockId: 'summary',
    fieldPath: 'summary',
    value: summary,
    multiline: true,
  })
  // Widened past the original `summary &&` guard per useEditableField's own
  // note - otherwise clearing the field's last character unmounts the node
  // the user is actively typing into.
  if (!summary && !summaryField.isEditable) return null
  return (
    <p className="post-preview__summary" {...summaryField.fieldProps}>
      {summaryField.content}
    </p>
  )
}

export function PostPreview({
  post,
  variant = 'featured',
  showLink = true,
  imageSize = 'fullSize',
  className,
  isEditable = false,
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
  // Spread onto author/category/date/featuredImage - fields that render here
  // but, unlike title/summary, can never become click-to-edit text
  // (relationship/relationship/date/upload). Only set once this exact post
  // is the document open in Live Preview (the `isEditable` prop, see its
  // own comment above) - never for a different post's card in a listing.
  // The attribute's VALUE is the field's own path, not an empty string - it
  // doubles as the scroll-to target `useBlockSyncListener`'s
  // `admin-field-focus` case looks up when the matching sidebar field is
  // focused (see that file's own comment on the `data-information-tab-hint`
  // fallback).
  const informationTabHintProps = (fieldPath: string) =>
    isEditable ? { 'data-information-tab-hint': fieldPath } : {}

  const content = (
    <div className={classNames}>
      {isDoc<Media>(featuredImage) && (
        <div {...informationTabHintProps('featuredImage')}>
          <MediaImage image={featuredImage} size={imageSize} />
        </div>
      )}
      <div className="post-preview__content">
        {variant === 'featured' && <Heading level={3}>{title}</Heading>}
        <div className="post-preview__meta">
          {isDoc<User>(author) && (
            <span className="post-preview__meta-item" {...informationTabHintProps('author')}>
              <User2 height={16} width={16} /> {author.name}
            </span>
          )}
          {isDoc<Category>(category) && (
            <span className="post-preview__meta-item" {...informationTabHintProps('category')}>
              <Tag width={16} height={16} /> {category.name}
            </span>
          )}
          {date && (
            <span className="post-preview__meta-item" {...informationTabHintProps('date')}>
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
        <EditableFieldProvider value={isEditable}>
          <PostSummary summary={summary ?? ''} />
        </EditableFieldProvider>
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
