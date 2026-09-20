type LivePreviewPathInput =
  | { type: 'collection'; collectionSlug: string; docSlug?: string | null }
  | { type: 'global'; globalSlug: string }

/**
 * Resolves the frontend path Live Preview should point at, or undefined to
 * disable the button for that document.
 *
 * Every global, plus the Pages "home" doc, all render at the same route
 * (`/`) - so without something to tell them apart, this would hand Payload's
 * LivePreview the identical URL string for all four. Payload's iframe is
 * keyed only by that `url` prop (see `@payloadcms/ui`'s LivePreviewWindow:
 * `<iframe src={url} ...>`, no key tied to which document is being edited),
 * so switching between two documents that resolve to the same URL never
 * changes `src` and the iframe silently keeps showing whichever one loaded
 * first - confirmed live: editing Header, saving, then switching to Pages'
 * Home doc kept rendering Header's pre-save data until a manual reload,
 * even though the server-side cache had already revalidated correctly. The
 * `__livePreviewDoc` marker breaks that tie for each of the four without
 * changing the real route: Next.js route matching and this project's own
 * page/global data fetching both ignore query strings, and it isn't read by
 * anything on the page, so it's inert everywhere except as an iframe `src`
 * Payload can tell apart.
 */
export function livePreviewPath(input: LivePreviewPathInput): string | undefined {
  if (input.type === 'global') return `/?__livePreviewDoc=global-${input.globalSlug}`

  const { collectionSlug, docSlug } = input

  if (collectionSlug === 'posts') {
    return docSlug ? `/blog/${docSlug}` : undefined
  }

  if (collectionSlug === 'pages') {
    if (!docSlug) return undefined
    if (docSlug === 'blog') return '/blog'
    return docSlug === 'home' ? '/?__livePreviewDoc=page-home' : `/${docSlug}`
  }

  return undefined
}
