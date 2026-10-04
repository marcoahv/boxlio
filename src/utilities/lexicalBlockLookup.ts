type NodeLike = {
  getParent(): NodeLike | null
}

type BlockNodeLike = NodeLike & {
  getFields(): { id?: string }
}

/**
 * Walks up from a Lexical node to the nearest enclosing embedded block -
 * mirrors `blockRowLookup.ts`'s role for Payload's native `blocks` field
 * rows, but for Lexical: there, a DOM id convention identifies the row;
 * here, only Lexical's own node tree does, since `BlocksNode.decorate()`
 * renders no id/data attribute carrying the block's own `fields.id`
 * (confirmed by reading `@payloadcms/richtext-lexical`'s `BlocksNode.js`).
 *
 * `isBlockNode` is dependency-injected (rather than imported directly from
 * `@payloadcms/richtext-lexical/client`) so this walk is unit-testable with
 * plain fake objects, without a real Lexical editor instance.
 */
export function findEnclosingBlockId(
  startNode: NodeLike | null,
  isBlockNode: (node: unknown) => node is BlockNodeLike,
): string | undefined {
  let node = startNode
  while (node) {
    if (isBlockNode(node)) return node.getFields().id
    node = node.getParent()
  }
  return undefined
}
