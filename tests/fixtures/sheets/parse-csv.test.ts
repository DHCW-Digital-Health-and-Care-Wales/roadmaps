import { describe, expect, it } from "vitest"

import { parseCsv } from "./parse-csv"

describe("parseCsv", () => {
  it("splits rows and cells", () => {
    expect(parseCsv("a,b\nc,d\n")).toEqual([
      ["a", "b"],
      ["c", "d"],
    ])
  })

  it("keeps commas, line breaks and doubled quotes inside quoted cells", () => {
    expect(parseCsv('"a, b","line 1\nline 2","say ""hi"""\r\nx,,')).toEqual([
      ["a, b", "line 1\nline 2", 'say "hi"'],
      ["x", "", ""],
    ])
  })

  it("keeps a last row with no line break, and blank rows as one blank cell", () => {
    expect(parseCsv("a\n\nb")).toEqual([["a"], [""], ["b"]])
  })

  it("reads nothing from an empty file", () => {
    expect(parseCsv("")).toEqual([])
  })
})
