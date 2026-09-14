import { describe, expect, it } from 'vitest'
import { isHexColor, normalizeHex } from '@/utilities/color'

describe('isHexColor', () => {
  it('accepts a lowercase 6-digit hex color', () => {
    expect(isHexColor('#d6c1a1')).toBe(true)
  })

  it('accepts an uppercase 6-digit hex color', () => {
    expect(isHexColor('#D6C1A1')).toBe(true)
  })

  it('rejects 3-digit shorthand', () => {
    expect(isHexColor('#fff')).toBe(false)
  })

  it('rejects a value missing the # prefix', () => {
    expect(isHexColor('d6c1a1')).toBe(false)
  })

  it('rejects a malformed value', () => {
    expect(isHexColor('#gggggg')).toBe(false)
  })

  it('rejects an empty string', () => {
    expect(isHexColor('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isHexColor(undefined)).toBe(false)
    expect(isHexColor(null)).toBe(false)
    expect(isHexColor(123456)).toBe(false)
  })
})

describe('normalizeHex', () => {
  it('adds a missing # prefix', () => {
    expect(normalizeHex('d6c1a1')).toBe('#d6c1a1')
  })

  it('lowercases an uppercase value', () => {
    expect(normalizeHex('#D6C1A1')).toBe('#d6c1a1')
  })

  it('trims surrounding whitespace', () => {
    expect(normalizeHex('  #d6c1a1  ')).toBe('#d6c1a1')
  })

  it('leaves an already-normalized value unchanged', () => {
    expect(normalizeHex('#d6c1a1')).toBe('#d6c1a1')
  })

  it('does not fix a malformed value - isHexColor still rejects it', () => {
    expect(isHexColor(normalizeHex('not-a-color'))).toBe(false)
  })
})
