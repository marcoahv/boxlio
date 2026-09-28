'use client'

import { useIsInsideLivePreview } from './useIsInsideLivePreview'
import { shouldShowCrossDocumentEditHint } from './shouldShowCrossDocumentEditHint'

/**
 * Whether a field that isn't editable right now (`isFieldEditable` false)
 * should show a "this belongs to a different document" hint instead - see
 * `shouldShowCrossDocumentEditHint` for the exact rule. Callers spread
 * `{ 'data-cross-document-hint': '<Label>' }` onto the same element
 * `useEditableField`'s `fieldProps` would otherwise mark, using whichever
 * global actually owns the field (not necessarily the component it's
 * rendered in - see `FooterCopyrightSiteName`).
 */
export function useCrossDocumentEditHint(isFieldEditable: boolean): boolean {
  const isInsideLivePreview = useIsInsideLivePreview()
  return shouldShowCrossDocumentEditHint(isInsideLivePreview, isFieldEditable)
}
