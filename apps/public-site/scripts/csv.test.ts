import { describe, expect, it } from "vitest"
import { parseCsv } from "./csv.ts"

describe("parseCsv", () => {
  it.each([
    [
      "splits rows and fields",
      "a,b\nc,d\n",
      [
        ["a", "b"],
        ["c", "d"],
      ],
    ],
    [
      "keeps the last row without a trailing newline",
      "a,b\nc,d",
      [
        ["a", "b"],
        ["c", "d"],
      ],
    ],
    [
      "handles CRLF line endings",
      "a,b\r\nc,d\r\n",
      [
        ["a", "b"],
        ["c", "d"],
      ],
    ],
    [
      "keeps commas, newlines and escaped quotes inside quoted fields",
      '"x, y","line 1\nline 2","say ""hi"""\n',
      [["x, y", "line 1\nline 2", 'say "hi"']],
    ],
    ["keeps empty fields", ",a,,\n", [["", "a", "", ""]]],
    ["returns no rows for empty input", "", []],
  ])("%s", (_, text, rows) => {
    expect(parseCsv(text)).toEqual(rows)
  })
})
