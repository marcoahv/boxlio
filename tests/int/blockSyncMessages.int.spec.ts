import { describe, expect, it } from 'vitest'
import { isBlockSyncEvent } from '@/utilities/blockSyncMessages'

const SERVER_URL = 'http://localhost:3000'

const makeEvent = (origin: string, data: unknown) => ({ origin, data }) as MessageEvent

describe('isBlockSyncEvent', () => {
  it('accepts a block-hover message from the configured server origin', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-hover', blockId: 'abc' }), SERVER_URL),
    ).toBe(true)
  })

  it('accepts a block-hover-clear message with no blockId', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-hover-clear' }), SERVER_URL),
    ).toBe(true)
  })

  it('accepts a block-select message', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-select', blockId: 'abc' }), SERVER_URL),
    ).toBe(true)
  })

  it('accepts a block-deselect message', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-deselect', blockId: 'abc' }), SERVER_URL),
    ).toBe(true)
  })

  it('accepts a block-text-edit message with all required fields', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, {
          type: 'block-text-edit',
          blockId: 'abc',
          fieldPath: 'heading',
          value: 'New heading',
        }),
        SERVER_URL,
      ),
    ).toBe(true)
  })

  it('rejects a block-text-edit message missing fieldPath', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, { type: 'block-text-edit', blockId: 'abc', value: 'New heading' }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('rejects a block-text-edit message missing value', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, { type: 'block-text-edit', blockId: 'abc', fieldPath: 'heading' }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('rejects a block-text-edit message with a non-string value', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, {
          type: 'block-text-edit',
          blockId: 'abc',
          fieldPath: 'heading',
          value: 123,
        }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('accepts a block-field-focus message with all required fields', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, { type: 'block-field-focus', blockId: 'abc', fieldPath: 'heading' }),
        SERVER_URL,
      ),
    ).toBe(true)
  })

  it('rejects a block-field-focus message missing fieldPath', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-field-focus', blockId: 'abc' }), SERVER_URL),
    ).toBe(false)
  })

  it('rejects a block-field-focus message missing blockId', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, { type: 'block-field-focus', fieldPath: 'heading' }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('accepts a block-field-blur message with all required fields', () => {
    expect(
      isBlockSyncEvent(
        makeEvent(SERVER_URL, { type: 'block-field-blur', blockId: 'abc', fieldPath: 'heading' }),
        SERVER_URL,
      ),
    ).toBe(true)
  })

  it('rejects a block-field-blur message missing fieldPath', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'block-field-blur', blockId: 'abc' }), SERVER_URL),
    ).toBe(false)
  })

  it('rejects a message from a different origin', () => {
    expect(
      isBlockSyncEvent(
        makeEvent('https://evil.example', { type: 'block-hover', blockId: 'abc' }),
        SERVER_URL,
      ),
    ).toBe(false)
  })

  it('rejects an unrelated message type, e.g. payload-live-preview', () => {
    expect(
      isBlockSyncEvent(makeEvent(SERVER_URL, { type: 'payload-live-preview' }), SERVER_URL),
    ).toBe(false)
  })

  it('rejects a message with no data', () => {
    expect(isBlockSyncEvent(makeEvent(SERVER_URL, null), SERVER_URL)).toBe(false)
  })
})
