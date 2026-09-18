export type BlockSyncMessage =
  | { type: 'block-hover'; blockId: string }
  | { type: 'block-hover-clear' }
  | { type: 'block-select'; blockId: string }
  | { type: 'block-deselect'; blockId: string }

const BLOCK_SYNC_MESSAGE_TYPES = new Set<BlockSyncMessage['type']>([
  'block-hover',
  'block-hover-clear',
  'block-select',
  'block-deselect',
])

/**
 * Distinct from `@payloadcms/live-preview`'s own `payload-live-preview`/
 * `payload-document-event` message types (see `isLivePreviewEvent`), so
 * neither side ever misinterprets the other's postMessage traffic.
 */
export const isBlockSyncEvent = (
  event: MessageEvent,
  serverURL: string,
): event is MessageEvent<BlockSyncMessage> =>
  event.origin === serverURL &&
  Boolean(event.data) &&
  typeof event.data === 'object' &&
  BLOCK_SYNC_MESSAGE_TYPES.has(event.data.type)
