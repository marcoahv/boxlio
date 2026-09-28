'use client'

import { useState } from 'react'
import { isSafeLinkUrl } from '@/utilities/richTextNodeSync'

export type RichTextToolbarState = {
  top: number
  left: number
  bold: boolean
  italic: boolean
  linked: boolean
}

/**
 * Purely presentational floating toolbar - positioning, selection tracking,
 * and mark toggling live in `EditableRichText.tsx`, which owns the
 * document-level `selectionchange` listener this needs `state` from. Every
 * button steals focus/selection on click, which is why the caller restores
 * the saved range before running each command - see
 * `EditableRichText.tsx`'s `withSelectionRestored`.
 */
export function RichTextToolbar({
  state,
  onToggleBold,
  onToggleItalic,
  onCreateLink,
  onRemoveLink,
}: {
  state: RichTextToolbarState
  onToggleBold: () => void
  onToggleItalic: () => void
  onCreateLink: (url: string) => void
  onRemoveLink: () => void
}) {
  const [showLinkInput, setShowLinkInput] = useState(false)
  const [linkValue, setLinkValue] = useState('')
  const [linkError, setLinkError] = useState(false)

  const confirmLink = () => {
    if (!isSafeLinkUrl(linkValue)) {
      setLinkError(true)
      return
    }
    onCreateLink(linkValue)
    setShowLinkInput(false)
    setLinkValue('')
    setLinkError(false)
  }

  return (
    <div
      className="ui-rich-text-toolbar"
      style={{ top: state.top, left: state.left }}
      role="toolbar"
      aria-label="Text formatting"
    >
      {showLinkInput ? (
        <>
          <input
            type="text"
            value={linkValue}
            onChange={(event) => {
              setLinkValue(event.target.value)
              setLinkError(false)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') {
                event.preventDefault()
                confirmLink()
              }
              if (event.key === 'Escape') setShowLinkInput(false)
            }}
            placeholder="https://…"
            aria-invalid={linkError}
            aria-label="Link URL"
            autoFocus
          />
          <button type="button" onClick={confirmLink}>
            Add
          </button>
          {linkError && <span role="alert">Enter a valid http(s) or relative URL</span>}
        </>
      ) : (
        <>
          <button type="button" aria-pressed={state.bold} onClick={onToggleBold}>
            <strong>B</strong>
          </button>
          <button type="button" aria-pressed={state.italic} onClick={onToggleItalic}>
            <em>I</em>
          </button>
          {state.linked ? (
            <button type="button" onClick={onRemoveLink}>
              Unlink
            </button>
          ) : (
            <button type="button" onClick={() => setShowLinkInput(true)}>
              Link
            </button>
          )}
        </>
      )}
    </div>
  )
}
