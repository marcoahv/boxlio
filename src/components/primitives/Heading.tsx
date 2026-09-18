import React from 'react'

export type HeadingProps = {
  level?: 1 | 2 | 3 | 4 | 5 | 6
  /** Visual size, when it should differ from the semantic level. */
  size?: 1 | 2 | 3 | 4 | 5 | 6
  children: React.ReactNode
  className?: string
} & Omit<React.HTMLAttributes<HTMLHeadingElement>, 'className' | 'children'>

// Literal strings, not interpolation — see the note in Stack.tsx.
const SIZE = {
  1: 'ui-heading-1',
  2: 'ui-heading-2',
  3: 'ui-heading-3',
  4: 'ui-heading-4',
  5: 'ui-heading-5',
  6: 'ui-heading-6',
} as const

/**
 * Heading whose document level is independent of its visual size, so a block
 * can sit correctly in the outline without dictating how large it looks.
 * A page's first heading should be level 1 regardless of which block renders it.
 *
 * Forwards its ref and any other DOM props (`...rest`) so a block can spread
 * `useEditableField()`'s props onto it for inline preview editing without
 * this primitive needing to know anything about that.
 */
export const Heading = React.forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { level = 2, size, children, className, ...rest },
  ref,
) {
  const Tag = `h${level}` as const
  return (
    <Tag ref={ref} className={[SIZE[size ?? level], className].filter(Boolean).join(' ')} {...rest}>
      {children}
    </Tag>
  )
})
