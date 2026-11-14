import { describe, expect, it } from "vitest"

import {
  detailsOf,
  detailsValue,
  englishDetails,
  parseDetailLines,
  settleDetails,
  shownLevels,
  withoutDetail,
} from "./item-details"
import { itemValue } from "./roadmap-changes"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const detail = (text: string, level = 0) => ({ text, level })
const read = (text: string, level = 0) => ({
  text: { en: text, cy: "" },
  level,
})

describe("an item's details as one field value (STY-039)", () => {
  it("is a line for each detail, in order, a hyphen for each level it is nested and then a space, or nothing (S14)", () => {
    const item = createTestRoadmapItem("Video appointments", {
      details: [
        read("Follow-up appointments in three specialties"),
        read("Dermatology", 1),
        read("Adult clinics first", 2),
        read("First appointments stay in person"),
      ],
    })

    expect(itemValue(item, "details")).toBe(
      [
        "Follow-up appointments in three specialties",
        "- Dermatology",
        "-- Adult clinics first",
        "First appointments stay in person",
      ].join("\n"),
    )
    expect(itemValue(createTestRoadmapItem("Bare"), "details")).toBe("")
  })

  it("reads back as the details it was made from", () => {
    const details = [detail("One"), detail("Two", 1), detail("Three", 2)]

    expect(detailsOf(detailsValue(details))).toEqual(details)
    expect(detailsOf("")).toEqual([])
  })

  it.each([
    [
      "every line starting with a hyphen",
      [read("One", 1), read("Two", 2), read("Three", 1)],
      "One\n- Two\nThree",
    ],
    ["a skipped level", [read("One"), read("Two", 2)], "One\n- Two"],
    [
      "a detail read deeper than the third level",
      [
        read("One"),
        read("Two", 1),
        read("Three", 2),
        read("Four", 3),
        read("Five", 4),
      ],
      "One\n- Two\n-- Three\n-- Four\n-- Five",
    ],
  ])(
    "holds the levels the details show at, for %s (S20, D18)",
    (_case, details, value) => {
      expect(
        itemValue(createTestRoadmapItem("Item", { details }), "details"),
      ).toBe(value)
    },
  )

  it("never keeps hyphens or spaces before a detail's text, at the level it was read (S20, D21)", () => {
    const item = createTestRoadmapItem("Item", {
      details: [read("Cold storage"), read("-5 degrees", 1)],
    })

    expect(itemValue(item, "details")).toBe("Cold storage\n- 5 degrees")
  })

  it("holds each detail trimmed, its white space single, with no blank line (S8)", () => {
    expect(
      detailsValue([detail("  One  two\tthree "), detail(" "), detail("Four")]),
    ).toBe("One two three\nFour")
  })

  it("removes a detail with no text as Remove does: those nested under it move up a level (S5, D20)", () => {
    expect(
      detailsValue([
        detail("One"),
        detail("-", 1),
        detail("Three", 2),
        detail("Four"),
      ]),
    ).toBe("One\n- Three\nFour")
  })
})

describe("parseDetailLines", () => {
  it("nests a line a level for each hyphen before its text, from the base level, and drops a blank line (S8, S9)", () => {
    expect(
      parseDetailLines("One\r\n- Two\n\n -- Three\n- -5 degrees", 1),
    ).toEqual([
      detail("One", 1),
      detail("Two", 2),
      detail("Three", 3),
      detail("5 degrees", 3),
    ])
  })

  it("ends a detail at a carriage return alone, as at any line break (S8)", () => {
    expect(parseDetailLines("One\r- Two\r\n- Three\n\rFour")).toEqual([
      detail("One"),
      detail("Two", 1),
      detail("Three", 1),
      detail("Four"),
    ])
  })
})

describe("englishDetails", () => {
  it("gives a value's details as an item holds them, in English alone", () => {
    expect(englishDetails("One\n- Two")).toEqual([
      { text: { en: "One", cy: "" }, level: 0 },
      { text: { en: "Two", cy: "" }, level: 1 },
    ])
    expect(englishDetails("")).toEqual([])
  })
})

describe("settleDetails", () => {
  it("nests each detail one level under the last one shallower than it, the first at the top, none deeper than the third (S3)", () => {
    expect(
      settleDetails([
        detail("a", 2),
        detail("b", 5),
        detail("c", 6),
        detail("d", 9),
        detail("e", 3),
        detail("f", 0),
      ]).map(({ level }) => level),
    ).toEqual([0, 1, 2, 2, 1, 0])
  })
})

describe("shownLevels", () => {
  it("gives the levels a list shows at, however deep, as the card nests them", () => {
    expect(shownLevels([1, 3, 3, 7, 9, 2, 0])).toEqual([0, 1, 1, 2, 3, 1, 0])
  })
})

describe("withoutDetail", () => {
  it("removes the detail alone: those nested under it stay, one level up (S6, D15)", () => {
    expect(
      withoutDetail(
        [
          detail("One"),
          detail("Two", 1),
          detail("Three", 2),
          detail("Four", 1),
          detail("Five"),
        ],
        1,
      ),
    ).toEqual([
      detail("One"),
      detail("Three", 1),
      detail("Four", 1),
      detail("Five"),
    ])
    expect(
      withoutDetail([detail("One"), detail("Two", 1), detail("Three", 1)], 0),
    ).toEqual([detail("Two"), detail("Three")])
  })
})
