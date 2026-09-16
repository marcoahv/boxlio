import type React from 'react'
import './styles.css'

/**
 * Global admin-panel styling hook (`admin.components.providers` in
 * payload.config.ts) - mounted once around the whole admin app, the
 * documented place to inject admin-wide CSS that isn't scoped to one
 * existing custom component. Renders no markup of its own.
 */
export function AdminTimestampStyles({ children }: { children: React.ReactNode }) {
  return children
}
