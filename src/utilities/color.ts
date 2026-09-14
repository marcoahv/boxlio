/**
 * The exact format a native `<input type="color">` always produces (and the
 * only format the six Settings brand-color fields store) - a lowercase or
 * uppercase 6-digit hex string, always `#`-prefixed. Rejects 3-digit
 * shorthand, an unprefixed value, and anything malformed.
 */
export function isHexColor(value: unknown): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)
}

/**
 * Adds a leading `#` if missing and lowercases, so a pasted value like
 * `D6C1A1` or ` #D6C1A1 ` normalizes to the same stored format the native
 * color picker itself produces, before it's checked with `isHexColor`.
 */
export function normalizeHex(raw: string): string {
  const trimmed = raw.trim()
  return (trimmed.startsWith('#') ? trimmed : `#${trimmed}`).toLowerCase()
}
