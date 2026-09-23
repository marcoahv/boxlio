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
  /**
   * Set when the section has a full-bleed media panel covering only HALF its
   * width (e.g. Hero's Split "Full-bleed" media fill) instead of the whole
   * section. Unlike hasBackgroundImage, a transparent Header floating on top
   * only needs to recolor the half of the *header* actually above the photo
   * (its logo when 'left', its links/icons/toggle when 'right' - see
   * _header.css's data-split-media-side rules) since the header is always
   * logo-left / controls-right (HeaderClient.tsx). The other half keeps
   * adopting the section's own Surface color, since it's really floating
   * over the text side, not the media. Mutually exclusive with
   * hasBackgroundImage in practice (Hero only sets one or the other).
   */
  splitMediaSide?: 'left' | 'right' | null
  /**
   * Set alongside hasBackgroundImage or splitMediaSide when the section's own
   * text needs fixed DARK text over its background media (e.g. Hero's
   * "Light" overlay color) instead of the default fixed light text. Lets a
   * transparent Header floating over this section (see _header.css) match
   * the same fixed pairing, never theme-relative - same reasoning as
   * hasBackgroundImage itself.
   */
  hasDarkOverlayText?: boolean
  /**
   * The rendered block's own id, published as `data-block-id` for the admin's
   * hover/select and inline-edit sync (`useBlockSyncListener`,
   * `useEditableField`). It rides on this element rather than a wrapper
   * around it on purpose: an extra element between <main>'s container and the
   * section makes every section match `.ui-section:first-child`, which the
   * header's logo and fixed-offset rules use to mean "the page's first block"
   * (see _header.css) - exactly the regression this prop was added to undo.
   */
  blockId?: string | null
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
  splitMediaSide,
  hasDarkOverlayText,
  blockId,
}: SectionProps) {
  return (
    <Tag
      id={id}
      className={['ui-section', className].filter(Boolean).join(' ')}
      data-block-id={blockId ?? undefined}
      data-surface={surface ?? 'default'}
      data-spacing={spacing ?? 'normal'}
      data-has-background-image={hasBackgroundImage ? 'true' : undefined}
      data-split-media-side={splitMediaSide ?? undefined}
      data-overlay-text-color={
        (hasBackgroundImage || splitMediaSide) && hasDarkOverlayText ? 'dark' : undefined
      }
    >
      {children}
    </Tag>
  )
}
