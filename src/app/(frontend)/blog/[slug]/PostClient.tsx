'use client'

import { Breadcrumbs } from '@/components/Breadcrumbs'
import { EditableRichText } from '@/components/RichText/EditableRichText'
import { Section, Container, Heading, Stack } from '@/components/primitives'
import { PostPreview } from '@/components/PostPreview'
import { getServerSideURL } from '@/utilities/getUrl'
import { useScopedLivePreview } from '@/utilities/useScopedLivePreview'
import { useBlockSyncListener } from '@/utilities/useBlockSyncListener'
import { useIsLivePreviewActive } from '@/utilities/useIsLivePreviewActive'
import { useEditableField } from '@/utilities/useEditableField'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'
import type { Post } from '@/payload-types'

/**
 * Its own component, not inlined in `PostClient`'s own render: `useEditableField`
 * reads editability off `EditableFieldContext` via `useIsEditableField()`, which
 * only sees a provider that's an actual JSX ancestor - a provider `PostClient`
 * renders around this component's element, not one it merely calls before
 * returning - same pattern as Footer's `FooterCopyrightSiteName`.
 */
function PostTitle({ title }: { title: string }) {
  const titleField = useEditableField({ blockId: 'title', fieldPath: 'title', value: title })
  return (
    <Heading level={1} {...titleField.fieldProps}>
      {titleField.content}
    </Heading>
  )
}

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
  useBlockSyncListener()
  const isEditable = useIsLivePreviewActive({ type: 'collection', collectionSlug: 'posts' })

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: data.title },
  ]

  return (
    <>
      {data.breadcrumbs?.show !== false && (
        <Breadcrumbs items={breadcrumbs} surface={data.breadcrumbs?.surface} />
      )}
      <Section surface={data.headerAppearance?.surface}>
        <Container className="ui-section-container">
          <EditableFieldProvider value={isEditable}>
            <Stack gap="lg">
              <PostTitle title={data.title} />
              <PostPreview
                post={data}
                variant="header"
                showLink={false}
                imageSize="thumbnail"
                isEditable={isEditable}
              />
            </Stack>
          </EditableFieldProvider>
        </Container>
      </Section>
      {/* Width/spacing come from Settings (--rich-text-max-width/-space, via
          the ui-rich-text-* marker classes), shared with RichTextBlock's own
          Section/Container - see _section.css. */}
      <Section surface={data.bodyAppearance?.surface} className="ui-rich-text-section">
        <Container className="ui-rich-text-container">
          <EditableFieldProvider value={isEditable}>
            <EditableRichText blockId="body" fieldPath="body" data={data.body} className="ui-prose" />
          </EditableFieldProvider>
        </Container>
      </Section>
    </>
  )
}
