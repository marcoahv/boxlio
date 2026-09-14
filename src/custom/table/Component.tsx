'use client'
import './cells-horizontal.css'

/** No UI of its own - registered as the cells field's afterInput slot purely to
 * load cells-horizontal.css into the admin bundle without re-rendering the
 * array field (which caused a duplicate-Config-context crash, see the fix
 * history for this block). */
export const TableCellsStyle = () => null
