import { describe, expect, it } from "vitest"

import { TabWriter } from "./tab-writer"

/** A tab of a header and five rows, each row's first cell its spreadsheet row number. */
function writer() {
  return new TabWriter(
    {
      properties: { sheetId: 7, title: "ProductA" },
      rows: [["Title"], ["2"], ["3"], ["4"], ["5"], ["6"]],
    },
    new Map([["Title", 0]]),
  )
}

/** The move of the row at 0-based `startIndex` to before what is at `destinationIndex`. */
const moved = (startIndex: number, destinationIndex: number) => ({
  moveDimension: {
    source: {
      sheetId: 7,
      dimension: "ROWS",
      startIndex,
      endIndex: startIndex + 1,
    },
    destinationIndex,
  },
})

describe("TabWriter.move (STY-051)", () => {
  it("sends the destination as counted before the row is taken out, down or up, after or before", () => {
    const down = writer()
    down.move(2, { after: 5 })
    expect(down.requests()).toEqual([moved(1, 5)])

    const up = writer()
    up.move(6, { after: 2 })
    expect(up.requests()).toEqual([moved(5, 2)])

    const before = writer()
    before.move(6, { before: 3 })
    before.move(2, { before: 5 })
    // Row 6 now sits at index 2, so row 5 is at index 5, one lower than read.
    expect(before.requests()).toEqual([moved(5, 2), moved(1, 5)])
  })

  it("works each move out over what the moves before it left, by the rows as read", () => {
    const tab = writer()

    tab.move(3, { after: 6 })
    tab.move(2, { after: 3 })
    tab.move(4, { after: 2 })

    // 2 3 4 5 6 → 2 4 5 6 3 → 4 5 6 3 2 → 5 6 3 2 4
    expect(tab.requests()).toEqual([moved(2, 6), moved(1, 6), moved(1, 6)])
  })

  it.each([
    ["just after the row above it", { after: 3 }],
    ["just before the row below it", { before: 5 }],
  ] as const)(
    "sends no move that would leave the row where it is: %s",
    (_where, to) => {
      const tab = writer()

      tab.move(4, to)

      expect(tab.requests()).toEqual([])
    },
  )

  it("sends the moves after every cell written, at its row as read, and before a row appended", () => {
    const tab = writer()

    tab.append([["Title", "New"]])
    tab.move(2, { after: 6 })
    tab.write(2, "Title", "Moved")

    expect(tab.requests().map((request) => Object.keys(request)[0])).toEqual([
      "updateCells",
      "moveDimension",
      "appendCells",
    ])
    expect(tab.requests()[0]).toMatchObject({
      updateCells: { start: { rowIndex: 1 } },
    })
  })

  it("rejects a row the tab was not read with", () => {
    expect(() => {
      writer().move(9, { after: 2 })
    }).toThrow(expect.objectContaining({ kind: "unknown" }))
    expect(() => {
      writer().move(2, { before: 9 })
    }).toThrow(expect.objectContaining({ kind: "unknown" }))
  })
})
