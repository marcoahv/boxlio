import { describe, expect, it } from 'vitest'
import { Media } from '@/collections/Media/config'

describe('Media imageSizes', () => {
  it('always enlarges undersized originals instead of omitting the size', () => {
    const imageSizes = Media.upload && 'imageSizes' in Media.upload ? Media.upload.imageSizes : undefined
    expect(imageSizes?.length).toBeGreaterThan(0)

    for (const size of imageSizes ?? []) {
      expect(size.withoutEnlargement, `${size.name} must set withoutEnlargement: false`).toBe(false)
    }
  })
})

describe('Media defaultPopulate', () => {
  it('includes sizes and blurDataUrl, since callers without an explicit populate override rely on it', () => {
    // @payloadcms/live-preview's mergeData populates relationships using each
    // collection's defaultPopulate and has no way to pass its own select -
    // omitting sizes/blurDataUrl here means Live Preview silently falls back
    // to each image's raw original file instead of its generated crop.
    expect(Media.defaultPopulate).toMatchObject({
      blurDataUrl: true,
      sizes: {
        thumbnail: true,
        card: true,
        fullSize: true,
        og: true,
      },
    })
  })
})
