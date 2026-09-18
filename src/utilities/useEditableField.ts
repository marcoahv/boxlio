'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import { useIsEditableField } from './EditableFieldContext'
import { postFromPreviewToAdmin } from './postFromPreviewToAdmin'

/**
 * Makes a rendered text element click-to-edit inside Payload's Live Preview
 * iframe, syncing keystrokes back into the matching admin form field (see
 * current-feature.md's Data/contracts). Spread `fieldProps` onto the element
 * that currently renders the text, and render `content` as its children
 * *instead of* the raw `value` prop - see the note below on why that swap is
 * required, not cosmetic. Outside live preview (`useIsEditableField()`
 * false) or with no `blockId`, `fieldProps` is `{}`, `content` is `value`,
 * and `isEditable` is `false`: no attribute, no `contentEditable`, no
 * behavior change from what's rendered today.
 *
 * `multiline` should be `true` for a field backed by a Payload `textarea`
 * (Enter inserts a line break) and `false` for a plain `text` field (Enter
 * is a no-op, matching the sidebar's own single-line `<input>`).
 *
 * A caller that only renders its element when `value` is truthy (e.g. an
 * optional subheading) must widen that condition with `isEditable` too -
 * otherwise clearing the field's last character unmounts the very node the
 * user is typing into. See callers in `src/blocks/*`.
 *
 * Why `content` isn't just `value`: once this element is `contentEditable`,
 * its real DOM text is a second, independent copy of the value - the one
 * the user is actively typing into. If the JSX children kept tracking the
 * live `value` prop, React would reconcile that text on every re-render
 * (including the debounced round trip that echoes a keystroke straight back
 * as a new `value`), and React's own DOM write resets the browser's caret to
 * the start even when the text it writes is byte-identical to what's
 * already there - the classic React-contentEditable cursor-jump bug. The
 * fix is to give React a `content` that never changes after mount (so it
 * never has a reason to touch this node's children again) and let the
 * effect below own every update from then on, straight to the DOM,
 * bypassing React's diffing entirely.
 */
export function useEditableField({
  blockId,
  fieldPath,
  value,
  multiline = false,
}: {
  blockId?: string | null
  fieldPath: string
  value: string
  multiline?: boolean
}) {
  const isEditable = useIsEditableField()
  const ref = useRef<HTMLElement>(null)
  const lastSyncedValue = useRef<string | null>(null)
  // Frozen at the moment editing turns on (lazy initializer, never called
  // again) - deliberately never updated after that, so React's own children
  // diffing has nothing left to react to. `useState`, not `useRef`: reading
  // `.current` during render is unsafe by React's own rules, but reading
  // state during render is exactly what it's for.
  const [initialValue] = useState(value)

  // The only writer of this element's real DOM text after mount: sets it
  // once on mount (lastSyncedValue starts as `null`, so the first run always
  // applies), then again for any *external* value change (another editor's
  // own live-preview merge) while this element isn't focused. Skipping
  // while focused is what keeps a keystroke here from fighting its own
  // cursor position. `useLayoutEffect`, not `useEffect`, so the mount-time
  // write lands before the browser paints - `content` is empty until then.
  useLayoutEffect(() => {
    const el = ref.current
    if (!el || document.activeElement === el || value === lastSyncedValue.current) return
    el.innerText = value
    lastSyncedValue.current = value
  }, [value])

  const handleInput = useCallback(() => {
    const el = ref.current
    if (!el || !blockId) return
    // `innerText`, not `textContent`: it resolves rendered line breaks
    // (from a multiline field's native Enter handling) back into literal
    // `\n`s, matching what the sidebar's own `textarea` stores.
    const text = el.innerText
    lastSyncedValue.current = text
    postFromPreviewToAdmin({ type: 'block-text-edit', blockId, fieldPath, value: text })
  }, [blockId, fieldPath])

  const handleFocus = useCallback(() => {
    if (!blockId) return
    // Once per focus, not per keystroke - `handleInput` already covers
    // every keystroke via `block-text-edit`.
    postFromPreviewToAdmin({ type: 'block-field-focus', blockId, fieldPath })
  }, [blockId, fieldPath])

  const handleBlur = useCallback(() => {
    if (!blockId) return
    // Lets the admin side auto-collapse the "Edit" accordion it auto-
    // expanded on focus - but only the one it opened itself, and only once
    // it's sure focus didn't just move to a sibling field in the same
    // block (see BlockFieldSync's own debounce for that check).
    postFromPreviewToAdmin({ type: 'block-field-blur', blockId, fieldPath })
  }, [blockId, fieldPath])

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && !multiline) event.preventDefault()
    },
    [multiline],
  )

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    event.preventDefault()
    // Plain text only - these are Payload `text`/`textarea` fields, never
    // rich text, so pasted formatting must never reach the stored value.
    document.execCommand('insertText', false, event.clipboardData.getData('text/plain'))
  }, [])

  if (!isEditable || !blockId) {
    return { isEditable: false as const, fieldProps: {}, content: value }
  }

  return {
    isEditable: true as const,
    content: initialValue,
    fieldProps: {
      ref,
      contentEditable: true,
      suppressContentEditableWarning: true,
      'data-editable-field': fieldPath,
      onInput: handleInput,
      onFocus: handleFocus,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      onPaste: handlePaste,
    },
  }
}
