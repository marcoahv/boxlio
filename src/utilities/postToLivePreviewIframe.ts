import { getServerSideURL } from './getUrl'
import type { BlockSyncMessage } from './blockSyncMessages'

export const LIVE_PREVIEW_IFRAME_ID = 'live-preview-iframe'

/**
 * Posts a block-sync message into Payload's built-in Live Preview iframe
 * (`@payloadcms/ui`'s `LivePreviewWindow` renders it with this exact
 * `id="live-preview-iframe"`). A silent no-op when the Live Preview tab
 * isn't open - there's no iframe in the document yet.
 */
export function postToLivePreviewIframe(message: BlockSyncMessage) {
  const iframe = document.getElementById(LIVE_PREVIEW_IFRAME_ID) as HTMLIFrameElement | null
  iframe?.contentWindow?.postMessage(message, getServerSideURL())
}
