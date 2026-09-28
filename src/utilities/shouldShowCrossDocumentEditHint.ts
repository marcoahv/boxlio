/**
 * Pure decision at the heart of `useCrossDocumentEditHint`: should a field
 * that carries an inline-editable marker (see `useEditableField`) show a
 * "this belongs to a different document" hint instead? True exactly when
 * genuinely inside some Live Preview session (any document, not necessarily
 * this field's own) and this field's own document isn't the one open. Kept
 * separate from the hook so the decision itself is unit-testable without a
 * browser - same split `shouldInterceptLivePreviewNavClick` already uses.
 */
export function shouldShowCrossDocumentEditHint(
  isInsideLivePreview: boolean,
  isFieldEditable: boolean,
): boolean {
  return isInsideLivePreview && !isFieldEditable
}
