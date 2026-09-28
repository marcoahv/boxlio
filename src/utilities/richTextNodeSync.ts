import type { SerializedEditorState, SerializedLexicalNode, SerializedTextNode } from 'lexical'
import type { SerializedLinkNode } from '@payloadcms/richtext-lexical'

/** Lexical's own text-format bitmask (`NodeFormat` in `@payloadcms/richtext-lexical`) - kept as local constants so this file has no runtime dependency on that internal export. */
const FORMAT_BOLD = 1
const FORMAT_ITALIC = 1 << 1
const FORMAT_STRIKETHROUGH = 1 << 2
const FORMAT_UNDERLINE = 1 << 3
const FORMAT_CODE = 1 << 4
const FORMAT_SUBSCRIPT = 1 << 5
const FORMAT_SUPERSCRIPT = 1 << 6

/** Top-level node types this feature makes editable - see current-feature.md's Out of scope. */
export const EDITABLE_NODE_TYPES = new Set(['paragraph', 'heading', 'quote'])

/** Only a scheme this project is willing to store from a toolbar-created link - never `javascript:` or another executable scheme. */
export function isSafeLinkUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('/')
}

function makeTextNode(text: string, format: number): SerializedTextNode {
  return {
    detail: 0,
    format,
    mode: 'normal',
    style: '',
    text,
    type: 'text',
    version: 1,
  }
}

/**
 * Payload's Lexical link node stores its target under `fields.url`
 * (`linkType`/`newTab`/`url`), not a top-level `url` like vanilla Lexical's
 * own `LinkNode` - see `@payloadcms/richtext-lexical`'s `LinkFields` type and
 * `LinkJSXConverter`'s reader (`node.fields.url`). Matching that shape here
 * is required for a toolbar-created link to render at all.
 */
function makeLinkNode(url: string, children: SerializedTextNode[]): SerializedLinkNode {
  return {
    children,
    direction: null,
    fields: { linkType: 'custom', newTab: false, url },
    format: '',
    indent: 0,
    type: 'link',
    version: 1,
  } as unknown as SerializedLinkNode
}

type Run = { text: string; format: number; linkUrl: string | null }

/**
 * Reads the text-format bits an element contributes, matching exactly what
 * `@payloadcms/richtext-lexical`'s own text-to-JSX converter renders for
 * each bit (bold -> <strong>, italic -> <em>, code -> <code>, subscript ->
 * <sub>, superscript -> <sup>, underline/strikethrough -> a `text-decoration`
 * inline style), read in reverse. This is how a mark already present in
 * saved content survives an edit even though only bold/italic can be
 * *turned on* from the new toolbar (current-feature.md's Data/contracts).
 */
function formatFromElement(el: HTMLElement): number {
  let format = 0
  const tag = el.tagName.toLowerCase()
  if (tag === 'strong' || tag === 'b') format |= FORMAT_BOLD
  if (tag === 'em' || tag === 'i') format |= FORMAT_ITALIC
  if (tag === 'code') format |= FORMAT_CODE
  if (tag === 'sub') format |= FORMAT_SUBSCRIPT
  if (tag === 'sup') format |= FORMAT_SUPERSCRIPT
  const decoration = el.style.textDecoration
  if (decoration.includes('underline')) format |= FORMAT_UNDERLINE
  if (decoration.includes('line-through')) format |= FORMAT_STRIKETHROUGH
  return format
}

/**
 * Walks `node` and its descendants, appending one `Run` per non-empty text
 * node reached - `inheritedFormat` accumulates down the tree so nested marks
 * (e.g. bold inside italic) combine, and `linkUrl` tracks whether the run
 * sits inside an `<a>` whose `href` passed `isSafeLinkUrl`. An unsafe `href`
 * (e.g. `javascript:`) is dropped here, not carried into a run - the text
 * survives the edit, the link does not.
 */
function collectRuns(node: ChildNode, inheritedFormat: number, linkUrl: string | null, runs: Run[]) {
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? ''
    if (text) runs.push({ format: inheritedFormat, linkUrl, text })
    return
  }
  if (!(node instanceof HTMLElement)) return

  if (node.tagName.toLowerCase() === 'a') {
    const href = node.getAttribute('href') ?? ''
    const nextLinkUrl = isSafeLinkUrl(href) ? href : null
    node.childNodes.forEach((child) => collectRuns(child, inheritedFormat, nextLinkUrl, runs))
    return
  }

  const format = inheritedFormat | formatFromElement(node)
  node.childNodes.forEach((child) => collectRuns(child, format, linkUrl, runs))
}

/** Groups consecutive same-link runs under one `link` node; a run with no link becomes a bare `text` node. An empty result still needs one empty text node - Lexical element nodes are never childless. */
function buildChildren(runs: Run[]): SerializedLexicalNode[] {
  const children: SerializedLexicalNode[] = []
  let i = 0
  while (i < runs.length) {
    const run = runs[i]
    if (run.linkUrl) {
      const linkChildren: SerializedTextNode[] = []
      while (i < runs.length && runs[i].linkUrl === run.linkUrl) {
        linkChildren.push(makeTextNode(runs[i].text, runs[i].format))
        i++
      }
      children.push(makeLinkNode(run.linkUrl, linkChildren))
    } else {
      children.push(makeTextNode(run.text, run.format))
      i++
    }
  }
  if (children.length === 0) children.push(makeTextNode('', 0))
  return children
}

/**
 * Converts one edited top-level DOM element back into its replacement
 * Lexical node. `originalNode`'s own `type`/`tag`/`format` (node-level, e.g.
 * heading level or alignment)/`indent`/`direction`/`version` pass through
 * untouched - only `children` is rebuilt from the DOM's current text and
 * marks. A node whose type isn't in `EDITABLE_NODE_TYPES` is returned
 * unchanged - callers only invoke this for nodes they made contentEditable
 * in the first place, so this is a defensive no-op, not the normal path.
 */
export function domNodeToLexicalNode(
  element: HTMLElement,
  originalNode: SerializedLexicalNode,
): SerializedLexicalNode {
  const type = (originalNode as { type?: unknown }).type
  if (typeof type !== 'string' || !EDITABLE_NODE_TYPES.has(type)) return originalNode

  const runs: Run[] = []
  element.childNodes.forEach((child) => collectRuns(child, 0, null, runs))

  return { ...originalNode, children: buildChildren(runs) }
}

/**
 * Splices one converted node back into a cloned copy of the full document at
 * `index` within `root.children` - the unit `block-rich-text-edit` posts is
 * always the whole field value (same granularity as `block-text-edit`), so
 * every sibling node the edit didn't touch must come along unchanged.
 */
export function withReplacedChild(
  document: SerializedEditorState,
  index: number,
  node: SerializedLexicalNode,
): SerializedEditorState {
  const children = [...document.root.children]
  children[index] = node
  return { ...document, root: { ...document.root, children } }
}
