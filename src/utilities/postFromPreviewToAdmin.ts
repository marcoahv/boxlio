import { getServerSideURL } from './getUrl'
import type { BlockSyncMessage } from './blockSyncMessages'

/**
 * The reverse of `postToLivePreviewIframe.ts`: posted from *inside* the
 * previewed page, up to the admin parent window hosting the Live Preview
 * iframe. Frontend and admin are one Next.js app on one origin, so the same
 * `getServerSideURL()` that gates the admin -> iframe direction is also the
 * correct target origin here. A silent no-op when this page isn't actually
 * embedded (a normal visit) - there's no parent listening.
 */
export function postFromPreviewToAdmin(message: BlockSyncMessage) {
  if (window.parent === window) return
  window.parent.postMessage(message, getServerSideURL())
}
