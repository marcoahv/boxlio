'use client'
import { useCollapsible } from '@payloadcms/ui'
import type { CollapsibleFieldLabelClientComponent } from 'payload'
import './styles.css'

export const BlockEditLabel: CollapsibleFieldLabelClientComponent = () => {
  const { isCollapsed } = useCollapsible()
  return <div className="block-edit-label">{isCollapsed ? 'Edit' : 'Done'}</div>
}
