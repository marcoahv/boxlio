export type BlockSyncMessage =
  | { type: 'block-hover'; blockId: string }
  | { type: 'block-hover-clear' }
  | { type: 'block-select'; blockId: string }
  | { type: 'block-deselect'; blockId: string }
  | { type: 'block-text-edit'; blockId: string; fieldPath: string; value: string }
  | { type: 'block-field-focus'; blockId: string; fieldPath: string }
  | { type: 'block-field-blur'; blockId: string; fieldPath: string }

const BLOCK_SYNC_MESSAGE_TYPES = new Set<BlockSyncMessage['type']>([
  'block-hover',
  'block-hover-clear',
  'block-select',
  'block-deselect',
  'block-text-edit',
  'block-field-focus',
  'block-field-blur',
])

/**
 * `block-text-edit` carries three required string fields beyond `type` -
 * unlike the hover/select messages (whose only payload is `blockId`), a
 * malformed one (missing `fieldPath`/`value`) must not silently corrupt an
 * unrelated form field, so this checks all three rather than trusting the
 * generic type-name match alone.
 */
function hasRequiredStringFields(data: Record<string, unknown>, keys: string[]): boolean {
  return keys.every((key) => typeof data[key] === 'string')
}

/**
 * Distinct from `@payloadcms/live-preview`'s own `payload-live-preview`/
 * `payload-document-event` message types (see `isLivePreviewEvent`), so
 * neither side ever misinterprets the other's postMessage traffic.
 */
export const isBlockSyncEvent = (
  event: MessageEvent,
  serverURL: string,
): event is MessageEvent<BlockSyncMessage> => {
  if (
    event.origin !== serverURL ||
    !event.data ||
    typeof event.data !== 'object' ||
    !BLOCK_SYNC_MESSAGE_TYPES.has(event.data.type)
  ) {
    return false
  }

  if (event.data.type === 'block-text-edit') {
    return hasRequiredStringFields(event.data, ['blockId', 'fieldPath', 'value'])
  }

  if (event.data.type === 'block-field-focus' || event.data.type === 'block-field-blur') {
    return hasRequiredStringFields(event.data, ['blockId', 'fieldPath'])
  }

  return true
}
