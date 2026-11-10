/**
 * Reads RFC 4180 CSV, such as the example spreadsheet's tabs, into rows of cells (test
 * code only). Quoted cells may hold commas, line breaks and doubled quotes; a line break
 * after the last row does not add a row.
 */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  const endCell = () => {
    row.push(cell)
    cell = ""
  }
  const endRow = () => {
    endCell()
    rows.push(row)
    row = []
  }

  for (let i = 0; i < text.length; i++) {
    const char = text.charAt(i)
    if (quoted) {
      if (char !== '"') cell += char
      else if (text.charAt(i + 1) === '"') cell += text.charAt(++i)
      else quoted = false
    } else if (char === '"') quoted = true
    else if (char === ",") endCell()
    else if (char === "\n") endRow()
    else if (char === "\r") {
      if (text.charAt(i + 1) === "\n") i++
      endRow()
    } else cell += char
  }
  if (cell !== "" || row.length > 0) endRow()
  return rows
}
