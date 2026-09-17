'use client'
import { SaveButton } from '@payloadcms/ui'
import type { UIFieldClientComponent } from 'payload'
import './styles.css'

export const InformationTabSaveButton: UIFieldClientComponent = () => {
  return (
    <div className="information-tab-save">
      <SaveButton />
    </div>
  )
}
