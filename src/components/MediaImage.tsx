import Image from 'next/image'
import type { Media } from '@/payload-types'
import { getMediaSize } from '@/utilities/getMediaSize'

export type MediaImageProps = {
  image: Media
  size?: keyof NonNullable<Media['sizes']>
  className?: string
  imgClassName?: string
  priority?: boolean
  /**
   * Radius token to apply. `site` (default) follows the editor-controlled
   * sitewide setting (Settings -> Image Corner Radius); `none`/`sm`/`lg`
   * are explicit overrides for a call site that deliberately wants to
   * diverge from that setting.
   */
  radius?: 'none' | 'sm' | 'site' | 'lg'
  /**
   * Renders in next/image's `fill` mode (absolutely positioned, covers its
   * parent via `object-fit: cover`) instead of the default intrinsic
   * width/height image. The parent must be a positioned element sized to
   * whatever area the image should cover.
   */
  fill?: boolean
}

const RADIUS = {
  none: 'rounded-[var(--radius-none)]',
  sm: 'rounded-[var(--radius-sm)]',
  site: 'rounded-[var(--radius-image)]',
  lg: 'rounded-[var(--radius-lg)]',
} as const

/**
 * Renders a Payload media doc at the right generated size, with its blur
 * placeholder when one exists.
 *
 * Payload-typed, so it lives here rather than in `primitives/` — the
 * portability rule keeps that folder free of Payload imports.
 */
export function MediaImage({
  image,
  size,
  className,
  imgClassName,
  priority,
  radius = 'site',
  fill = false,
}: MediaImageProps) {
  const resolved = getMediaSize(image, size)
  if (!resolved?.url) return null

  // placeholder="blur" throws without blurDataURL, and the hook that generates
  // it only runs on upload — older media may predate it.
  const blur = image.blurDataUrl ?? undefined

  return (
    <div className={className}>
      <Image
        className={[
          fill ? 'ui-img-cover' : 'ui-img h-auto',
          RADIUS[radius],
          imgClassName,
        ]
          .filter(Boolean)
          .join(' ')}
        src={resolved.url}
        alt={image.alt || ''}
        {...(fill
          ? { fill: true as const }
          : { width: resolved.width ?? 1280, height: resolved.height ?? 720 })}
        blurDataURL={blur}
        placeholder={blur ? 'blur' : 'empty'}
        priority={priority}
      />
    </div>
  )
}
