/**
 * The next set of flipped item ids after a visitor activates `id`.
 *
 * Pure and exported on its own so the toggle rule is testable without
 * mounting the block (see `tests/int/accordionOpenState.int.spec.ts`,
 * following the same extract-the-logic convention as `Pagination`'s
 * `buildHref`). The component owns only the `useState` around it.
 *
 * With `allowMultiple` off, activating an item collapses the set to just that
 * one (classic FAQ behavior); with it on, items toggle independently.
 * Re-activating an item already in the set removes it in both modes, so a
 * visitor can always undo what they just did - without that, the single-open
 * mode would leave no way to close the last panel.
 *
 * "Flipped" rather than "open" because the component inverts what the set
 * means while inline editing is on - see its own note.
 */
export function toggleOpen(
  openIds: readonly string[],
  id: string,
  allowMultiple: boolean,
): string[] {
  if (openIds.includes(id)) return openIds.filter((openId) => openId !== id)
  return allowMultiple ? [...openIds, id] : [id]
}
