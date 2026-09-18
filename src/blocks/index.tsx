import { blockComponents } from './registry'

type BlockData = {
  blockType?: string | null
  id?: string | null
}

/**
 * Renders a page's block layout by dispatching each entry through the registry.
 *
 * A map rather than a `switch`: a switch costs three lines per block and would
 * run to hundreds of lines across a full library. The single cast below is the
 * price — Payload generates a discriminated union for block props, but the map
 * erases the correlation between `blockType` and its matching variant.
 */
export const Blocks = ({ blocks }: { blocks?: BlockData[] | null }) => {
  if (!blocks?.length) return null

  return (
    <>
      {blocks.map((block, index) => {
        const { blockType, id } = block
        if (!blockType) return null

        const Component = blockComponents[blockType]
        if (!Component) {
          if (process.env.NODE_ENV === 'development') {
            console.warn(
              `[blocks] No component registered for "${blockType}". ` +
                `Add it to blockComponents in src/blocks/registry.ts.`,
            )
          }
          return null
        }

        // No wrapper element: each block publishes its own `data-block-id`
        // on its root <Section> (see that primitive's `blockId` prop for why
        // an extra element here breaks `.ui-section:first-child`).
        return <Component key={id ?? index} {...block} />
      })}
    </>
  )
}
