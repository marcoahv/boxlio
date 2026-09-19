import { describe, expect, it } from 'vitest'
import { shouldInterceptLivePreviewNavClick } from '@/utilities/shouldInterceptLivePreviewNavClick'

const currentHref = 'http://localhost:3000/'

const plainClick = {
  currentHref,
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
}

describe('shouldInterceptLivePreviewNavClick', () => {
  it('intercepts a plain click on a same-origin internal link', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
      }),
    ).toBe(true)
  })

  it('intercepts a relatively-resolved internal link (a live <a>.href is already absolute)', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/home',
        target: null,
      }),
    ).toBe(true)
  })

  it('leaves a Cmd/Ctrl-click alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
        ctrlKey: true,
      }),
    ).toBe(false)
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
        metaKey: true,
      }),
    ).toBe(false)
  })

  it('leaves a Shift/Alt-click alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
        shiftKey: true,
      }),
    ).toBe(false)
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
        altKey: true,
      }),
    ).toBe(false)
  })

  it('leaves a non-primary button click alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: null,
        button: 1,
      }),
    ).toBe(false)
  })

  it('leaves a target="_blank" link alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog',
        target: '_blank',
      }),
    ).toBe(false)
  })

  it('leaves an external-origin link alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'https://example.com/',
        target: null,
      }),
    ).toBe(false)
  })

  it('leaves a same-page hash link alone', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/#features',
        target: null,
      }),
    ).toBe(false)
  })

  it('intercepts a hash link that also changes the page', () => {
    expect(
      shouldInterceptLivePreviewNavClick({
        ...plainClick,
        href: 'http://localhost:3000/blog#features',
        target: null,
      }),
    ).toBe(true)
  })
})
