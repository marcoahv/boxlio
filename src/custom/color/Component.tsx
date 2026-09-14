'use client'

import { useEffect, useState } from 'react'
import { FieldDescription, FieldError, FieldLabel, useField } from '@payloadcms/ui'
import type { TextFieldClientComponent } from 'payload'
import { isHexColor, normalizeHex } from '@/utilities/color'

const FALLBACK_HEX = '#000000'

/**
 * Generic color Field, reused by all six Settings brand-color fields (see
 * src/globals/Settings/config.ts) - reads `path`/`field` from props rather
 * than hardcoding one field name.
 *
 * Two inputs share one stored value: the native `<input type="color">`
 * picker, and a text input for pasting a hex code directly. The text input
 * keeps its own local `text` state so a partial/invalid in-progress paste
 * doesn't get committed to the field (which would also break the color
 * picker's `value`, since it only accepts a complete hex string) - only a
 * value that normalizes to a valid hex calls `setValue`. `text` re-syncs
 * from the field's value whenever that value changes from either input, so
 * a picker selection updates the text field too.
 */
export const ColorPickerField: TextFieldClientComponent = ({ field, path }) => {
  const { errorMessage, setValue, showError, value } = useField<string>({ path })
  const hex = typeof value === 'string' && value ? value : FALLBACK_HEX
  const [text, setText] = useState(hex)

  useEffect(() => {
    setText(hex)
  }, [hex])

  return (
    <div className="field-type text">
      <FieldLabel htmlFor={path} label={field.label} path={path} required={field.required} />
      <div style={{ alignItems: 'center', display: 'flex', gap: '0.8rem' }}>
        <input
          id={path}
          onChange={(event) => setValue(event.target.value)}
          style={{ height: '4.8rem', padding: 0, width: '9.6rem' }}
          type="color"
          value={hex}
        />
        <input
          aria-label="Hex color value"
          onChange={(event) => {
            const raw = event.target.value
            setText(raw)
            const normalized = normalizeHex(raw)
            if (isHexColor(normalized)) {
              setValue(normalized)
            }
          }}
          placeholder="#d6c1a1"
          style={{ fontFamily: 'monospace' }}
          type="text"
          value={text}
        />
      </div>
      <FieldDescription description={field.admin?.description} path={path} />
      <FieldError message={errorMessage} path={path} showError={showError} />
    </div>
  )
}
