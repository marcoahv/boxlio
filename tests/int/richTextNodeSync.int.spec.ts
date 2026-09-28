import { describe, expect, it } from 'vitest'
import { domNodeToLexicalNode, isSafeLinkUrl, withReplacedChild } from '@/utilities/richTextNodeSync'

const FORMAT_BOLD = 1
const FORMAT_ITALIC = 1 << 1

const paragraphNode = (overrides: Record<string, unknown> = {}) => ({
  children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'Hello', type: 'text', version: 1 }],
  direction: 'ltr' as const,
  format: '' as const,
  indent: 0,
  type: 'paragraph',
  version: 1,
  ...overrides,
})

const el = (html: string, tag = 'p') => {
  const element = document.createElement(tag)
  element.innerHTML = html
  return element
}

describe('domNodeToLexicalNode', () => {
  it('rebuilds a plain text edit', () => {
    const original = paragraphNode()
    const result = domNodeToLexicalNode(el('Hello there'), original) as typeof original
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'Hello there', type: 'text', version: 1 },
    ])
  })

  it('reads bold from a <strong> element', () => {
    const result = domNodeToLexicalNode(el('Hello <strong>world</strong>'), paragraphNode()) as ReturnType<
      typeof paragraphNode
    >
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'Hello ', type: 'text', version: 1 },
      { detail: 0, format: FORMAT_BOLD, mode: 'normal', style: '', text: 'world', type: 'text', version: 1 },
    ])
  })

  it('reads italic from an <em> element', () => {
    const result = domNodeToLexicalNode(el('<em>world</em>'), paragraphNode()) as ReturnType<
      typeof paragraphNode
    >
    expect(result.children).toEqual([
      { detail: 0, format: FORMAT_ITALIC, mode: 'normal', style: '', text: 'world', type: 'text', version: 1 },
    ])
  })

  it('combines overlapping bold and italic', () => {
    const result = domNodeToLexicalNode(
      el('<strong><em>Hi</em></strong>'),
      paragraphNode(),
    ) as ReturnType<typeof paragraphNode>
    expect(result.children).toEqual([
      {
        detail: 0,
        format: FORMAT_BOLD | FORMAT_ITALIC,
        mode: 'normal',
        style: '',
        text: 'Hi',
        type: 'text',
        version: 1,
      },
    ])
  })

  it('reads underline and strikethrough from a text-decoration style', () => {
    const result = domNodeToLexicalNode(
      el('<span style="text-decoration: underline">u</span><span style="text-decoration: line-through">s</span>'),
      paragraphNode(),
    ) as ReturnType<typeof paragraphNode>
    expect(result.children).toEqual([
      { detail: 0, format: 1 << 3, mode: 'normal', style: '', text: 'u', type: 'text', version: 1 },
      { detail: 0, format: 1 << 2, mode: 'normal', style: '', text: 's', type: 'text', version: 1 },
    ])
  })

  it('wraps a run in a link node for a safe href', () => {
    const result = domNodeToLexicalNode(
      el('Visit <a href="https://example.com">here</a>'),
      paragraphNode(),
    ) as ReturnType<typeof paragraphNode>
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'Visit ', type: 'text', version: 1 },
      {
        children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'here', type: 'text', version: 1 }],
        direction: null,
        fields: { linkType: 'custom', newTab: false, url: 'https://example.com' },
        format: '',
        indent: 0,
        type: 'link',
        version: 1,
      },
    ])
  })

  it('drops a javascript: link, keeping the text as an unlinked run', () => {
    const result = domNodeToLexicalNode(
      el('<a href="javascript:alert(1)">bad</a>'),
      paragraphNode(),
    ) as ReturnType<typeof paragraphNode>
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'bad', type: 'text', version: 1 },
    ])
  })

  it('removing the <a> from previously-linked text drops the link', () => {
    const linked = paragraphNode({
      children: [
        {
          children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'here', type: 'text', version: 1 }],
          direction: null,
          fields: { linkType: 'custom', newTab: false, url: 'https://example.com' },
          format: '',
          indent: 0,
          type: 'link',
          version: 1,
        },
      ],
    })
    const result = domNodeToLexicalNode(el('here'), linked) as ReturnType<typeof paragraphNode>
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'here', type: 'text', version: 1 },
    ])
  })

  it('preserves the original node-level fields, only replacing children', () => {
    const original = {
      children: [{ detail: 0, format: 0, mode: 'normal', style: '', text: 'Old', type: 'text', version: 1 }],
      direction: 'rtl' as const,
      format: 'center' as const,
      indent: 2,
      tag: 'h2',
      type: 'heading',
      version: 1,
    }
    const result = domNodeToLexicalNode(el('New', 'h2'), original) as typeof original
    expect(result.direction).toBe('rtl')
    expect(result.format).toBe('center')
    expect(result.indent).toBe(2)
    expect(result.tag).toBe('h2')
    expect(result.type).toBe('heading')
    expect(result.version).toBe(1)
    expect(result.children).toEqual([
      { detail: 0, format: 0, mode: 'normal', style: '', text: 'New', type: 'text', version: 1 },
    ])
  })

  it('leaves a non-editable node type unchanged', () => {
    const listNode = { children: [], direction: null, format: '', indent: 0, listType: 'bullet', tag: 'ul', type: 'list', version: 1 }
    const result = domNodeToLexicalNode(el('<li>ignored</li>', 'ul'), listNode)
    expect(result).toBe(listNode)
  })
})

describe('isSafeLinkUrl', () => {
  it.each(['https://example.com', 'http://example.com', '/relative/path'])('accepts %s', (url) => {
    expect(isSafeLinkUrl(url)).toBe(true)
  })

  it.each(['javascript:alert(1)', 'data:text/html,evil', 'mailto:a@b.com'])('rejects %s', (url) => {
    expect(isSafeLinkUrl(url)).toBe(false)
  })
})

describe('withReplacedChild', () => {
  it('replaces only the targeted index, leaving siblings and other document fields untouched', () => {
    const document = {
      root: {
        children: [paragraphNode(), paragraphNode({ children: [] })],
        direction: 'ltr' as const,
        format: '' as const,
        indent: 0,
        type: 'root',
        version: 1,
      },
    }
    const replacement = paragraphNode({ children: [] })
    const result = withReplacedChild(document, 0, replacement)
    expect(result.root.children[0]).toBe(replacement)
    expect(result.root.children[1]).toBe(document.root.children[1])
    expect(document.root.children[0]).not.toBe(replacement)
  })
})
