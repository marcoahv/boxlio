import { describe, expect, it } from 'vitest'
import { isGenuineLivePreviewDocumentMessage } from '@/utilities/useIsInsideLivePreview'

const SERVER_URL = 'http://localhost:3000'

const makeEvent = (origin: string, data: unknown) => ({ origin, data }) as MessageEvent

describe('isGenuineLivePreviewDocumentMessage', () => {
  it('rejects the bare ready() handshake self-delivered on an ordinary page view', () => {
    // @payloadcms/live-preview's ready() posts this to window.opener ||
    // window.parent, which is the window itself on a normal top-level page -
    // this must never register as "inside Live Preview".
    expect(
      isGenuineLivePreviewDocumentMessage(
        makeEvent(SERVER_URL, { type: 'payload-live-preview', ready: true }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('accepts a genuine collection document message', () => {
    expect(
      isGenuineLivePreviewDocumentMessage(
        makeEvent(SERVER_URL, {
          type: 'payload-live-preview',
          collectionSlug: 'pages',
          data: {},
        }),
        SERVER_URL,
      ),
    ).toBe(true)
  })

  it('accepts a genuine global document message', () => {
    expect(
      isGenuineLivePreviewDocumentMessage(
        makeEvent(SERVER_URL, { type: 'payload-live-preview', globalSlug: 'header', data: {} }),
        SERVER_URL,
      ),
    ).toBe(true)
  })

  it('rejects a message from the wrong origin', () => {
    expect(
      isGenuineLivePreviewDocumentMessage(
        makeEvent('https://evil.example.com', {
          type: 'payload-live-preview',
          collectionSlug: 'pages',
        }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('rejects an unrelated message type', () => {
    expect(
      isGenuineLivePreviewDocumentMessage(
        makeEvent(SERVER_URL, { type: 'payload-document-event', collectionSlug: 'pages' }),
        SERVER_URL,
      ),
    ).toBe(false)
  })
})
