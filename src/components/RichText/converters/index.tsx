import { internalDocToHref } from '@/components/RichText/converters/internalLink'
import { type JSXConvertersFunction, LinkJSXConverter } from '@payloadcms/richtext-lexical/react'
import type { DefaultNodeTypes, SerializedBlockNode } from '@payloadcms/richtext-lexical'
import { uploadConverter } from './uploadConverter'
import { blockComponents } from '@/blocks/registry'
import { EditableFieldProvider } from '@/utilities/EditableFieldContext'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type NodeTypes = DefaultNodeTypes | SerializedBlockNode<any>

/**
 * Block converters are derived from the registry rather than listed here, so a
 * block registered in `src/blocks/registry.ts` becomes usable inside rich text
 * automatically — no second place to update.
 *
 * Built inside the function, not at module scope. The import graph is a cycle
 * — registry → RichTextBlock → RichText → this file → registry — so reading
 * `blockComponents` while this module is still evaluating throws
 * "Cannot access 'blockComponents' before initialization". Deferring the read
 * to render time lets the cycle resolve.
 *
 * Every embedded block renders inside a `<span className="contents">` (a
 * Tailwind `display: contents` utility, so it never affects layout) wrapping
 * an `EditableFieldProvider value={false}`. Both exist for a field like
 * Post's `body` (`BlocksFeature` enabled) once it's rendered through
 * `EditableRichText`: Payload's own `convertLexicalNodesToJSX` drops any
 * top-level node whose converter returns `null` from the rendered array
 * entirely, so a block that renders nothing (an empty `FeatureGrid`/`Table`,
 * a contentless `RichTextBlock`) would otherwise shift every later DOM
 * child's index out of alignment with `root.children`, corrupting which
 * node a sibling paragraph/heading edit gets spliced into on Save. The
 * `<span>` guarantees one DOM child per top-level block node regardless of
 * what the block itself renders. The provider resets the page-wide
 * `useIsEditableField()` flag to `false` for the embedded block's own
 * subtree, so a block's own fields (a Hero heading, a FeatureGrid item)
 * never inherit an editable `body` field's context and try to sync through
 * a `blockId` the admin side can't resolve (it was never rendered as a
 * top-level `blocks`-array row).
 */
const buildBlockConverters = () =>
  Object.fromEntries(
    Object.entries(blockComponents).map(([slug, Component]) => [
      slug,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ({ node }: { node: SerializedBlockNode<any> }) => (
        <span className="contents">
          <EditableFieldProvider value={false}>
            <Component {...node.fields} />
          </EditableFieldProvider>
        </span>
      ),
    ]),
  )

export const jsxConverters: JSXConvertersFunction<NodeTypes> = ({ defaultConverters }) => ({
  ...defaultConverters,
  ...LinkJSXConverter({ internalDocToHref }),
  upload: ({ node }) => {
    return uploadConverter({ uploadNode: node })
  },
  blocks: buildBlockConverters(),
})
