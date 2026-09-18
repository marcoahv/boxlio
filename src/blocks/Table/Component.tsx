import { Section, Container, Heading } from '@/components/primitives'
import { RichText } from '@/components/RichText'
import { useEditableField } from '@/utilities/useEditableField'
import type { TableBlock as TableBlockProps } from '@/payload-types'

/** General N-column table: rows and cells are both free-form arrays, so
 * column count is whatever the editor keeps consistent across rows. */
export function Table(props: TableBlockProps) {
  const { id, surface, heading, hasHeaderRow, rows } = props
  const headingField = useEditableField({ blockId: id, fieldPath: 'heading', value: heading ?? '' })
  if (!rows?.length) return null

  const headerRow = hasHeaderRow ? rows[0] : null
  const bodyRows = hasHeaderRow ? rows.slice(1) : rows

  return (
    <Section surface={surface}>
      <Container>
        {(heading || headingField.isEditable) && (
          <Heading level={2} className="mb-6" {...headingField.fieldProps}>
            {headingField.content}
          </Heading>
        )}
        <div className="ui-table-scroll">
          <table className="ui-table">
            {headerRow && (
              <thead>
                <tr>
                  {headerRow.cells?.map((cell, index) => (
                    <th key={cell.id ?? index}>
                      <RichText data={cell.content} />
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {bodyRows.map((row, rowIndex) => (
                <tr key={row.id ?? rowIndex}>
                  {row.cells?.map((cell, cellIndex) => (
                    <td key={cell.id ?? cellIndex}>
                      <RichText data={cell.content} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Container>
    </Section>
  )
}
