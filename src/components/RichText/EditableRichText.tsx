'use client'

import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { SerializedEditorState, SerializedLexicalNode } from 'lexical'
import { RichText } from '@/components/RichText'
import { RichTextToolbar, type RichTextToolbarState } from '@/components/RichText/RichTextToolbar'
import { useIsEditableField } from '@/utilities/EditableFieldContext'
import { postFromPreviewToAdmin } from '@/utilities/postFromPreviewToAdmin'
import { domNodeToLexicalNode, EDITABLE_NODE_TYPES, withReplacedChild } from '@/utilities/richTextNodeSync'

type Props = {
  blockId?: string | null
  fieldPath: string
  data: SerializedEditorState
  className?: string
}

/**
 * Makes a `RichTextBlock`'s rendered prose click-to-edit inside Payload's
 * Live Preview iframe - the rich text counterpart to `useEditableField`
 * (current-feature.md). Outside live preview, or with no `blockId`, this
 * renders exactly what `RichText` renders today.
 *
 * Unlike a plain text field, the top-level nodes here are rendered by
 * `RichText`'s own converter pipeline (a Fragment, no wrapper this component
 * controls - see `disableContainer` in `RichText/index.tsx`), so there's no
 * JSX element of ours to spread `contentEditable`/handlers onto. Instead,
 * once mounted, this walks its own container's direct children - which
 * render 1:1 with `data.root.children`, since `RichText`'s Fragment
 * contributes no extra wrapper - and wires up only the ones whose original
 * node type is in `EDITABLE_NODE_TYPES` (`list`/`upload`/`relationship`/
 * `horizontalrule` etc. are left exactly as rendered).
 *
 * `data` only re-renders this tree while nothing in this block is focused -
 * the same reason `useEditableField` only re-applies an external `value`
 * while its element isn't focused: once a node is `contentEditable`, its DOM
 * text is a second, independent copy, and React re-diffing it while the user
 * is actively typing would fight the browser's own caret. Granularity here
 * is per-block, not per-node (simpler, and only one node in a block can be
 * focused at once anyway): an external update - the sidebar's own Lexical
 * edit, or this component's own edit echoing back through Payload's live
 * preview merge - refreshes the whole block once focus leaves it, never
 * while any node in it is focused.
 */
export function EditableRichText({ blockId, fieldPath, data, className }: Props) {
  const isEditable = useIsEditableField()
  const containerRef = useRef<HTMLDivElement>(null)
  const [renderedData, setRenderedData] = useState(data)
  const [prevData, setPrevData] = useState(data)
  // The last full document actually sent - each edit splices its one
  // changed node into this, not into `renderedData`, so editing one
  // paragraph and then another doesn't revert the first (see
  // `withReplacedChild`'s own doc comment on why the whole field value is
  // the unit of sync).
  const latestDocumentRef = useRef<SerializedEditorState>(renderedData)
  // Every editable region's own sync function, keyed by its live DOM
  // element - the floating toolbar's commands (`withSelectionRestored`) look
  // up the right one by which region contains the restored selection,
  // rather than tracking "the currently focused region" as separate state.
  const regionsRef = useRef<Map<HTMLElement, () => void>>(new Map())
  // The last non-collapsed selection range seen inside one of this block's
  // editable regions - every toolbar command restores it first, because
  // clicking a toolbar button (a plain <button>) moves focus/selection onto
  // the button itself before the click handler ever runs.
  const savedRangeRef = useRef<Range | null>(null)
  const [toolbar, setToolbar] = useState<RichTextToolbarState | null>(null)
  // Whether any editable region in this block currently has native DOM
  // focus - state, not a ref, because the render-phase check below (for
  // "derive state from a prop change") is only allowed to read state, never
  // a ref (`react-hooks/refs`). Kept in sync by the same onFocus/onBlur
  // listeners the wiring effect already attaches, called from real browser
  // event handling, never from render itself.
  const [isBlockFocused, setIsBlockFocused] = useState(false)

  // Keeps `latestDocumentRef` - the running base every local edit splices
  // into - matching `renderedData` whenever it changes, whether that's the
  // initial mount or an external refresh applied below. A ref write belongs
  // in an effect, not render, so this can't live inside the render-phase
  // branch that decides whether to refresh in the first place.
  useLayoutEffect(() => {
    latestDocumentRef.current = renderedData
  }, [renderedData])

  useLayoutEffect(() => {
    if (!isEditable || !blockId) return
    const container = containerRef.current
    if (!container) return

    const cleanups: (() => void)[] = []
    const regions = regionsRef.current
    regions.clear()

    Array.from(container.children).forEach((child, index) => {
      const originalNode = renderedData.root.children[index] as SerializedLexicalNode | undefined
      const type = (originalNode as { type?: unknown } | undefined)?.type
      if (typeof type !== 'string' || !EDITABLE_NODE_TYPES.has(type) || !(child instanceof HTMLElement)) {
        return
      }

      const el = child
      el.contentEditable = 'true'
      el.setAttribute('data-editable-field', fieldPath)

      const sync = () => {
        const newNode = domNodeToLexicalNode(el, originalNode as SerializedLexicalNode)
        const updated = withReplacedChild(latestDocumentRef.current, index, newNode)
        latestDocumentRef.current = updated
        postFromPreviewToAdmin({ type: 'block-rich-text-edit', blockId, fieldPath, value: updated })
      }
      regions.set(el, sync)

      const onFocus = () => {
        setIsBlockFocused(true)
        postFromPreviewToAdmin({ type: 'block-field-focus', blockId, fieldPath })
      }
      const onBlur = () => {
        setIsBlockFocused(false)
        postFromPreviewToAdmin({ type: 'block-field-blur', blockId, fieldPath })
      }

      // A new top-level paragraph/heading is a structural change (a new
      // entry in `root.children`) this slice doesn't support - see
      // current-feature.md's Out of scope - so Enter is a no-op here,
      // matching `useEditableField`'s own non-multiline fields.
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Enter') event.preventDefault()
      }

      // Plain text only, same rule as `useEditableField`'s paste handler -
      // pasted formatting must never reach the stored value from this
      // control.
      const onPaste = (event: ClipboardEvent) => {
        event.preventDefault()
        document.execCommand('insertText', false, event.clipboardData?.getData('text/plain') ?? '')
      }

      // A click on a link inside editable prose starts editing, not
      // navigation - same reasoning as `useEditableField`'s own link click
      // guard.
      const onClick = (event: MouseEvent) => {
        if (event.target instanceof Element && event.target.closest('a')) event.preventDefault()
      }

      el.addEventListener('input', sync)
      el.addEventListener('focus', onFocus)
      el.addEventListener('blur', onBlur)
      el.addEventListener('keydown', onKeyDown)
      el.addEventListener('paste', onPaste)
      el.addEventListener('click', onClick)

      cleanups.push(() => {
        el.contentEditable = 'false'
        el.removeAttribute('data-editable-field')
        el.removeEventListener('input', sync)
        el.removeEventListener('focus', onFocus)
        el.removeEventListener('blur', onBlur)
        el.removeEventListener('keydown', onKeyDown)
        el.removeEventListener('paste', onPaste)
        el.removeEventListener('click', onClick)
      })
    })

    // Shows the toolbar only for a non-collapsed selection that sits inside
    // one of this block's own editable regions - anywhere else (a different
    // block, the admin sidebar, a collapsed caret) hides it. Also stashes
    // the range itself (see `savedRangeRef`'s own comment) so a later
    // toolbar click can restore exactly this selection before running its
    // command.
    const onSelectionChange = () => {
      const selection = document.getSelection()
      if (!selection || selection.isCollapsed || selection.rangeCount === 0) {
        setToolbar(null)
        return
      }
      const anchorNode = selection.anchorNode
      const anchorEl = anchorNode instanceof Element ? anchorNode : anchorNode?.parentElement
      const region = anchorEl ? [...regions.keys()].find((el) => el.contains(anchorEl)) : undefined
      if (!region) {
        setToolbar(null)
        return
      }

      const range = selection.getRangeAt(0)
      savedRangeRef.current = range.cloneRange()
      const rect = range.getBoundingClientRect()
      setToolbar({
        top: rect.top,
        left: rect.left + rect.width / 2,
        bold: document.queryCommandState('bold'),
        italic: document.queryCommandState('italic'),
        linked: anchorEl instanceof Element ? Boolean(anchorEl.closest('a')) : false,
      })
    }

    document.addEventListener('selectionchange', onSelectionChange)
    cleanups.push(() => document.removeEventListener('selectionchange', onSelectionChange))

    return () => {
      cleanups.forEach((cleanup) => cleanup())
      regions.clear()
      setToolbar(null)
    }
  }, [isEditable, blockId, fieldPath, renderedData])

  // Picks up an external update - the sidebar's own Lexical edit, or this
  // component's own edit echoing back through Payload's live preview merge -
  // but only once nothing in this block is focused (see this component's own
  // doc comment). Adjusted during render, not an effect - React's own
  // recommended pattern for "derive state from a prop change" (an effect
  // here would let one stale frame render first, then correct itself a tick
  // later).
  if (isEditable && blockId && data !== prevData) {
    setPrevData(data)
    if (!isBlockFocused) setRenderedData(data)
  }

  /**
   * Restores the last selection seen inside an editable region (clicking any
   * toolbar button - a plain `<button>` - moves focus/selection onto the
   * button first, so the command would otherwise apply nowhere), focuses
   * that region, runs `action`, then re-syncs that one region through its
   * own `sync` function - the same path a keystroke's `input` event takes.
   */
  const withSelectionRestored = useCallback((action: () => void) => {
    const range = savedRangeRef.current
    if (!range) return
    const anchorNode = range.commonAncestorContainer
    const anchorEl = anchorNode instanceof Element ? anchorNode : anchorNode.parentElement
    const region = anchorEl
      ? [...regionsRef.current.keys()].find((el) => el.contains(anchorEl))
      : undefined
    if (!region) return

    region.focus()
    const selection = document.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)

    action()

    regionsRef.current.get(region)?.()
  }, [])

  const handleToggleBold = useCallback(
    () => withSelectionRestored(() => document.execCommand('bold')),
    [withSelectionRestored],
  )
  const handleToggleItalic = useCallback(
    () => withSelectionRestored(() => document.execCommand('italic')),
    [withSelectionRestored],
  )
  const handleCreateLink = useCallback(
    (url: string) => withSelectionRestored(() => document.execCommand('createLink', false, url)),
    [withSelectionRestored],
  )
  const handleRemoveLink = useCallback(
    () => withSelectionRestored(() => document.execCommand('unlink')),
    [withSelectionRestored],
  )

  if (!isEditable || !blockId) {
    return (
      <div className={className}>
        <RichText data={data} />
      </div>
    )
  }

  return (
    <div className={className} ref={containerRef}>
      <RichText data={renderedData} />
      {toolbar && (
        <RichTextToolbar
          state={toolbar}
          onToggleBold={handleToggleBold}
          onToggleItalic={handleToggleItalic}
          onCreateLink={handleCreateLink}
          onRemoveLink={handleRemoveLink}
        />
      )}
    </div>
  )
}
