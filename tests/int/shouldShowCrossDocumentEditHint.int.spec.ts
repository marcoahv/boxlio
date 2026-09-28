import { describe, expect, it } from 'vitest'
import { shouldShowCrossDocumentEditHint } from '@/utilities/shouldShowCrossDocumentEditHint'

describe('shouldShowCrossDocumentEditHint', () => {
  it('shows the hint when inside Live Preview and the field is not editable', () => {
    expect(shouldShowCrossDocumentEditHint(true, false)).toBe(true)
  })

  it('never shows the hint when the field is already editable', () => {
    expect(shouldShowCrossDocumentEditHint(true, true)).toBe(false)
  })

  it('never shows the hint outside Live Preview, even if the field is not editable', () => {
    expect(shouldShowCrossDocumentEditHint(false, false)).toBe(false)
  })

  it('never shows the hint outside Live Preview when the field is editable either', () => {
    expect(shouldShowCrossDocumentEditHint(false, true)).toBe(false)
  })
})
