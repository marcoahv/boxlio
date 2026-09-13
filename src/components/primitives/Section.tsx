import React from 'react'

export type Surface = 'default' | 'muted' | 'inverse' | 'accent'
export type Spacing = 'none' | 'tight' | 'normal' | 'loose'

export type SectionProps = {
  surface?: Surface | null
  spacing?: Spacing | null
  children: React.ReactNode
  className?: string
  id?: string
  as?: 'section' | 'header' | 'footer' | 'article' | 'aside' | 'div'
  /**
   * Set when the section renders its own full-bleed background image (e.g.
   * Hero's "Image background" layout) behind its content. A transparent
   * <Header> sitting on top of this section, when it's the page's first,
   * adopts fixed light text instead of this section's own Surface
   * foreground — see _header.css's data-has-background-image rule — since
   * an arbitrary photo can't guarantee the same contrast a flat Surface
   * color can.
   */
  hasBackgroundImage?: boolean
}

/**
 * A full-bleed horizontal band — the outermost element of every block.
 *
 * Surface and spacing are chosen from a fixed set of ROLES, never raw values.
 * Each `data-surface` sets background and foreground together (see
 * `./_section.css`), so a section cannot render unreadable text
 * on its own background.
 *
 * Wrap the contents in <Container> to constrain their width; this element
 * stays full-width so its background can run edge to edge.
 */
export function Section({
  surface = 'default',
  spacing = 'normal',
  children,
  className,
  id,
  as: Tag = 'section',
  hasBackgroundImage,
}: SectionProps) {
  return (
    <Tag
      id={id}
      className={['ui-section', className].filter(Boolean).join(' ')}
      data-surface={surface ?? 'default'}
      data-spacing={spacing ?? 'normal'}
      data-has-background-image={hasBackgroundImage ? 'true' : undefined}
    >
      {children}
    </Tag>
  )
}
