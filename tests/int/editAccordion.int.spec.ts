import { describe, expect, it } from 'vitest'
import type { Field, UIField } from 'payload'
import { editAccordionField } from '@/fields/editAccordion'

describe('editAccordionField', () => {
  const inputFields: Field[] = [
    { name: 'surface', type: 'select', options: ['default'] },
    { name: 'heading', type: 'text' },
  ]
  const result = editAccordionField(inputFields)

  it('returns a single collapsible field labeled Edit', () => {
    expect(result).toHaveLength(1)
    const [field] = result
    expect(field.type).toBe('collapsible')
    if (field.type !== 'collapsible') throw new Error('expected a collapsible field')
    expect(field.label).toBe('Edit')
    expect(field.admin?.initCollapsed).toBe(true)
    expect(field.admin?.className).toBe('info-tab-edit-collapsible block-edit-collapsible')
  })

  it('starts with the auto-collapse and save ui fields, in order', () => {
    const [field] = result
    if (field.type !== 'collapsible') throw new Error('expected a collapsible field')
    const [autoCollapse, save] = field.fields

    expect(autoCollapse.type).toBe('ui')
    expect((autoCollapse as UIField).name).toBe('blockEditAutoCollapse')
    const autoCollapseComponent = (autoCollapse as UIField).admin?.components?.Field
    expect(autoCollapseComponent).toMatchObject({
      exportName: 'InformationTabEditAutoCollapse',
      clientProps: { skipForcedCollapseIfFresh: true },
    })

    expect(save.type).toBe('ui')
    expect((save as UIField).name).toBe('blockEditSave')
    expect((save as UIField).admin?.components?.Field).toBe(
      '@/custom/information-tab-save/Component.tsx#InformationTabSaveButton',
    )
  })

  it('preserves the given fields unchanged after the two ui fields', () => {
    const [field] = result
    if (field.type !== 'collapsible') throw new Error('expected a collapsible field')
    expect(field.fields.slice(2)).toEqual(inputFields)
  })
})
