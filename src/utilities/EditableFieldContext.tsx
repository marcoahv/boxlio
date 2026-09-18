'use client'

import { createContext, useContext } from 'react'

/**
 * Whether inline text editing is currently active for the page's own
 * blocks (see `useIsLivePreviewActive`). One provider per page, mounted
 * once above `<Blocks>`, so every block reads the same flag via context
 * instead of each subscribing to its own `message` listener.
 */
const EditableFieldContext = createContext(false)

export const EditableFieldProvider = EditableFieldContext.Provider

export function useIsEditableField(): boolean {
  return useContext(EditableFieldContext)
}
