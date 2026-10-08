'use client'
import { useRowLabel } from '@payloadcms/ui'

export const ArrayRowLabel = ({ fallbackLabel = 'Link' }: { fallbackLabel?: string }) => {
  const {
    data: { label },
    rowNumber,
  } = useRowLabel<{ label?: string }>()

  return <div>{label || `${fallbackLabel} ${String(rowNumber).padStart(2, '0')}`}</div>
}

export const CardRowLabel = () => {
  const {data: {title}, rowNumber} = useRowLabel<{title: string}>()
  const customLabel = title || `Card ${String(rowNumber).padStart(2, '0')}`
  return <div>{customLabel}</div>
}

/** Same fallback pattern as `ArrayRowLabel`, reading `heading` instead of `label` - Carousel's own slides are headed by `heading` (required, mirroring Hero), not `label`. */
export const HeadingRowLabel = ({ fallbackLabel = 'Slide' }: { fallbackLabel?: string }) => {
  const {
    data: { heading },
    rowNumber,
  } = useRowLabel<{ heading?: string }>()

  return <div>{heading || `${fallbackLabel} ${String(rowNumber).padStart(2, '0')}`}</div>
}
