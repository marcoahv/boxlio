import type { CollectionConfig } from 'payload'
import { changeFilename } from './hooks/changeFilename'
import { generateBlurData } from '@/collections/Media/hooks/generateBlurData'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    group: 'Content',
  },
  // Governs every relationship population that doesn't explicitly override it -
  // notably @payloadcms/live-preview's mergeData, which has no way to pass its
  // own `populate`/`select`. Omitting `sizes`/`blurDataUrl` here means Live
  // Preview silently falls back to each image's raw original file (see
  // getMediaSize.ts's fallback), breaking any fixed-size layout - while the
  // real page, whose queries explicitly select `sizes`, always rendered fine.
  defaultPopulate: {
    url: true,
    filename: true,
    width: true,
    height: true,
    alt: true,
    blurDataUrl: true,
    sizes: {
      thumbnail: true,
      card: true,
      fullSize: true,
      og: true,
    },
  },
  access: {
    read: () => true,
    create: ({ req }) => Boolean(req.user),
    update: ({ req }) => Boolean(req.user),
    delete: ({ req }) => Boolean(req.user),
  },
  hooks: {
    beforeOperation: [
      changeFilename
    ],
    beforeChange: [
      generateBlurData
    ]
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
      required: true,
    },
    {
      name: 'blurDataUrl',
      type: 'text',
      label: 'Blur Data URL',
      admin: {
        description: 'Placeholder blurred image. Automatically generated.',
        readOnly: true,
      }
    }
  ],
  upload: {
    disableLocalStorage: Boolean(process.env.S3_BUCKET && process.env.S3_ACCESS_KEY_ID),
    mimeTypes: ['image/*'],
    formatOptions: {
      format: 'webp'
    },
    imageSizes: [
      {
        name: 'thumbnail',
        width: 320,
        height: 180,
        // Without this, Payload silently omits the size (leaving sizes.thumbnail.url
        // null) for any source image smaller than 320x180 in both dimensions, and
        // callers fall back to the unprocessed original - breaking fixed-aspect
        // layouts for smaller images.
        withoutEnlargement: false,
        formatOptions: {
          format: 'webp',
        },
        admin: {
          disableListFilter: true,
          disableGroupBy: true,
          disableListColumn: true,
        }
      },
      {
        name: 'card',
        width: 640,
        height: 360,
        withoutEnlargement: false,
        formatOptions: {
          format: 'webp',
        },
        admin: {
          disableListFilter: true,
          disableGroupBy: true,
          disableListColumn: true,
        }
      },
      {
        name: 'fullSize',
        width: 1280,
        height: 720,
        withoutEnlargement: false,
        formatOptions: {
          format: 'webp',
        },
        admin: {
          disableListFilter: true,
          disableGroupBy: true,
          disableListColumn: true,
        }
      },
      {
        name: 'og',
        width: 1920,
        height: 1080,
        withoutEnlargement: false,
        formatOptions: {
          format: 'png',
          options: {
            quality: 80,
          }
        },
        admin: {
          disableListFilter: true,
          disableGroupBy: true,
          disableListColumn: true,
        }
      }
    ],
    adminThumbnail: 'thumbnail',
  },
}
