import { describe, expect, it } from 'vitest'
import { livePreviewPath } from '@/utilities/livePreviewPath'

describe('livePreviewPath', () => {
  it('resolves the home page slug to / with a doc marker', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'pages', docSlug: 'home' }),
    ).toBe('/?__livePreviewDoc=page-home')
  })

  it('resolves the blog-slug page to /blog', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'pages', docSlug: 'blog' }),
    ).toBe('/blog')
  })

  it('resolves other page slugs to /<slug>', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'pages', docSlug: 'about' }),
    ).toBe('/about')
  })

  it('disables pages with no slug', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'pages', docSlug: undefined }),
    ).toBeUndefined()
  })

  it('resolves posts to /blog/<slug>', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'posts', docSlug: 'my-post' }),
    ).toBe('/blog/my-post')
  })

  it('disables posts with no slug', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'posts', docSlug: undefined }),
    ).toBeUndefined()
  })

  it('disables an unknown collection', () => {
    expect(
      livePreviewPath({ type: 'collection', collectionSlug: 'media', docSlug: 'x' }),
    ).toBeUndefined()
  })

  it('resolves a global to / with a doc marker unique to that global', () => {
    expect(livePreviewPath({ type: 'global', globalSlug: 'header' })).toBe(
      '/?__livePreviewDoc=global-header',
    )
    expect(livePreviewPath({ type: 'global', globalSlug: 'footer' })).toBe(
      '/?__livePreviewDoc=global-footer',
    )
  })

  it('gives every document that renders at / a distinct URL', () => {
    const urls = [
      livePreviewPath({ type: 'global', globalSlug: 'header' }),
      livePreviewPath({ type: 'global', globalSlug: 'footer' }),
      livePreviewPath({ type: 'global', globalSlug: 'settings' }),
      livePreviewPath({ type: 'collection', collectionSlug: 'pages', docSlug: 'home' }),
    ]
    expect(new Set(urls).size).toBe(urls.length)
  })
})
