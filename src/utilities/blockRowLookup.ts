// Payload's own BlocksField/BlockRow renders this exact, deterministic id on
// every row's outer wrapper - `${parentPath.split('.').join('-')}-row-${index}`
// - unconditionally, regardless of whether that row is collapsed or still
// lazily loading its own fields. Resolving a block by this row id (rather
// than a component nested *inside* the block's own fields) means there's
// nothing that depends on the row ever having been expanded.
export const ROW_SELECTOR = '[id^="blocks-row-"], [id^="blogBlocks-row-"]'
export const ROW_ID_PATTERN = /^(blocks|blogBlocks)-row-(\d+)$/

type GetField = (path: string) => { value?: unknown } | undefined

/** A block row element's own block id, read off its (stable) `id` field. */
export function resolveBlockId(rowEl: Element, getField: GetField): string | undefined {
  const match = rowEl.id.match(ROW_ID_PATTERN)
  if (!match) return undefined
  const [, fieldName, rowIndex] = match
  return getField(`${fieldName}.${rowIndex}.id`)?.value as string | undefined
}

/**
 * The reverse lookup: given a block id, find the row element currently
 * rendering it. Block rows can be reordered, so a block's index isn't
 * stable - only its id is - which is why this re-scans the live DOM each
 * time rather than caching a blockId -> index map.
 */
export function findRowElementForBlockId(
  blockId: string,
  getField: GetField,
): Element | undefined {
  const rows = document.querySelectorAll(ROW_SELECTOR)
  for (const rowEl of rows) {
    if (resolveBlockId(rowEl, getField) === blockId) return rowEl
  }
  return undefined
}

/** Splits a row element's own `id` (`${fieldName}-row-${rowIndex}`) apart. */
export function parseRowId(rowEl: Element): { fieldName: string; rowIndex: string } | undefined {
  const match = rowEl.id.match(ROW_ID_PATTERN)
  if (!match) return undefined
  const [, fieldName, rowIndex] = match
  return { fieldName, rowIndex }
}
