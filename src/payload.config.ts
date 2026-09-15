import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'
import {s3Storage} from '@payloadcms/storage-s3'
import {getServerSideURL} from '@/utilities/getUrl'
import { livePreviewPath } from '@/utilities/livePreviewPath'

import { Users } from './collections/Users/config'
import { Media } from './collections/Media/config'
import { Pages } from '@/collections/Pages/config'
import { Posts } from '@/collections/Posts/config'
import { Settings } from '@/globals/Settings/config'
import { Header } from '@/globals/Header/config'
import { Footer } from '@/globals/Footer/config'
import { Categories } from '@/collections/Categories/config'
import { blockConfigs } from '@/blocks/registry'
import { seoPlugin } from '@payloadcms/plugin-seo'
import { resendAdapter } from '@payloadcms/email-resend'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

/** Shown in admin titles and OG tags. Override per project via env. */
const SITE_NAME = process.env.SITE_NAME || 'Site Builder'

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
    components: {
      graphics: {
        Icon: '@/custom/admin-branding/Component.tsx#AdminIcon',
        Logo: '@/custom/admin-branding/Component.tsx#AdminLogo',
      },
    },
    meta: {
      titleSuffix: ` - ${SITE_NAME}`,
      description: `Content management for ${SITE_NAME}`,
      openGraph: {
        description: `Content management for ${SITE_NAME}`,
        siteName: SITE_NAME,
      },
    },
    livePreview: {
      collections: ['pages', 'posts'],
      globals: ['header', 'footer', 'settings'],
      breakpoints: [
        { label: 'Mobile', name: 'mobile', width: 375, height: 667 },
        { label: 'Tablet', name: 'tablet', width: 768, height: 1024 },
        { label: 'Desktop', name: 'desktop', width: 1440, height: 900 },
      ],
      url: ({ data, collectionConfig, globalConfig }) => {
        const path = globalConfig
          ? livePreviewPath({ type: 'global' })
          : livePreviewPath({
              type: 'collection',
              collectionSlug: collectionConfig?.slug ?? '',
              docSlug: data?.slug,
            })
        return path ? `${getServerSideURL()}${path}` : undefined
      },
    },
  },
  email:
    process.env.RESEND_API_KEY && process.env.EMAIL_FROM_ADDRESS
      ? resendAdapter({
          apiKey: process.env.RESEND_API_KEY,
          defaultFromAddress: process.env.EMAIL_FROM_ADDRESS,
          defaultFromName: process.env.EMAIL_FROM_NAME || SITE_NAME,
        })
      : undefined,
  collections: [Users, Pages, Posts, Categories, Media],
  globals: [Header, Settings, Footer],
  // Registered globally so collections can reference blocks by slug.
  // See src/blocks/registry.ts.
  blocks: blockConfigs,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URL || '',
  }),
  sharp,
  plugins: [
    seoPlugin({
      generateTitle: ({ doc }) => doc.title,
      generateDescription: ({ doc, collectionSlug }) => {
        if (collectionSlug === 'posts') return doc?.summary
        if (collectionSlug === 'pages') return doc?.title
        return SITE_NAME
      },
      generateURL: ({ doc, collectionSlug }) => {
        const isHome = doc.slug === 'home'
        return `${getServerSideURL()}${collectionSlug === 'pages' ? '' : `/${collectionSlug}`}/${isHome ? '' : doc.slug}`
      },
      generateImage: ({ doc }) => doc.featuredImage,
    }),
    s3Storage({
      enabled: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID),
      collections: {
        media: {
          // Only rewrite URLs when a public CDN origin is configured. Without
          // it, Payload serves media through its own route, which is correct
          // for local dev and for buckets that are not publicly readable.
          ...(process.env.S3_PUBLIC_URL
            ? {
                generateFileURL: ({ filename }: { filename: string }) =>
                  `${process.env.S3_PUBLIC_URL}/${filename}`,
              }
            : {}),
        },
      },
      bucket: process.env.S3_BUCKET || 'unused-local-dev-bucket',
      config: {
        endpoint: process.env.S3_API,
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || 'unused',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || 'unused',
        },
        region: 'auto',
      },
    }),
  ],
})
