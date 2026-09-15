import { Media, Page, Post, Setting } from '@/payload-types'
import { isDoc } from '@/utilities/isDoc'
import { Metadata } from 'next'
import { getServerSideURL } from '@/utilities/getUrl'

type Doc = Partial<Post> | Partial<Page>

const getImageURL = (
  image?: Media | string | null,
): string | null => {
  const media = isDoc<Media>(image) ? image : null
  if (media) {
    const ogUrl = media.sizes?.og?.url
    return ogUrl ? ogUrl : media.url ? media.url : null
  }
  return null
}

export const generateMeta = async (args: {
  doc: Doc | null
  settings: Setting
}): Promise<Metadata> => {
  const { doc, settings } = args
  const serverUrl = getServerSideURL()
  const title = doc?.meta?.title || doc?.title || ''
  const description =
    doc?.meta?.description ||
    (doc as Post)?.summary ||
    settings.siteDescription ||
    ''
  const ogImage = doc?.meta?.image
    ? getImageURL(doc?.meta.image)
    : doc?.featuredImage
      ? getImageURL(doc?.featuredImage)
      : null
  const canonicalUrl = doc?.meta?.canonicalUrl || null
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: canonicalUrl || serverUrl,
      siteName: settings.siteName || 'Boxlio',
      ...(ogImage && { image: [{ url: ogImage }] }),
      locale: 'en_US',
      type: 'website',
    },
    ...(canonicalUrl && {
      alternates: {
        canonical: canonicalUrl,
      },
    }),
  }
}
