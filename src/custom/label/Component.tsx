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
