import { describe, expect, it } from "vitest"
import { compareText, fold, parseTextBlocks } from "./text"

describe("fold", () => {
  it("lower-cases and removes accents", () => {
    expect(fold("Ŵyl Ŷd CAFÉ")).toBe("wyl yd cafe")
  })
})

describe("compareText", () => {
  it("orders by code point", () => {
    expect(["b", "a", "B", "a"].sort(compareText)).toEqual(["B", "a", "a", "b"])
    expect(compareText("a", "a")).toBe(0)
  })
})

describe("parseTextBlocks", () => {
  it.each([
    ["returns nothing for empty text", "", []],
    ["returns nothing for blank lines", " \n\n ", []],
    [
      "makes each other line its own paragraph, skipping blank lines",
      "One\nTwo\n\n  Three  ",
      [
        { type: "paragraph", text: "One" },
        { type: "paragraph", text: "Two" },
        { type: "paragraph", text: "Three" },
      ],
    ],
    [
      'turns "- ", "• " and "* " lines into one list',
      "Intro:\n- one\n• two\n * three",
      [
        { type: "paragraph", text: "Intro:" },
        { type: "list", items: ["one", "two", "three"] },
      ],
    ],
    [
      'removes a trailing comma, semicolon or ", and" from list items',
      "- apples,\n- pears ;\n- plums, and\n- figs.",
      [{ type: "list", items: ["apples", "pears", "plums", "figs."] }],
    ],
    [
      "keeps commas in paragraphs and dashes without a space",
      "First,\n-not a bullet",
      [
        { type: "paragraph", text: "First," },
        { type: "paragraph", text: "-not a bullet" },
      ],
    ],
    [
      "ends a list at a blank line or a plain line",
      "- a\nAfter\n- b\n\n- c",
      [
        { type: "list", items: ["a"] },
        { type: "paragraph", text: "After" },
        { type: "list", items: ["b"] },
        { type: "list", items: ["c"] },
      ],
    ],
  ])("%s", (_, text, blocks) => {
    expect(parseTextBlocks(text)).toEqual(blocks)
  })
})
