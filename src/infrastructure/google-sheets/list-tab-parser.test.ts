import { describe, expect, it } from "vitest"

import {
  parseCategories,
  parseFamilies,
  type ListTabProblem,
} from "./list-tab-parser"

const FAMILY_HEADER = ["ID", "Name", "Name (cy)", "Colour"]
const CATEGORY_HEADER = ["ID", "Name", "Name (cy)"]

function problem(
  code: ListTabProblem["code"],
  { row = null, column = null, value = null }: Partial<ListTabProblem>,
): ListTabProblem {
  return { code, row, column, value }
}

describe("parseFamilies", () => {
  it("reads each row as a family, with its colour in lower case", () => {
    expect(
      parseFamilies([
        FAMILY_HEADER,
        [" fc29g5b9 ", " Single Record ", "Cofnod Sengl", "#12A3C9"],
        ["vdkxj63m", "Medicines & Diagnostics", "", "#006747"],
      ]),
    ).toStrictEqual({
      list: [
        {
          id: "fc29g5b9",
          name: { en: "Single Record", cy: "Cofnod Sengl" },
          colour: "#12a3c9",
        },
        {
          id: "vdkxj63m",
          name: { en: "Medicines & Diagnostics", cy: "" },
          colour: "#006747",
        },
      ],
      problems: [],
    })
  })

  it("finds columns by header, in any order and spelling, and ignores blank rows", () => {
    const { list, problems } = parseFamilies([
      ["colour", "Name - Cymraeg", "id", "NAME"],
      ["#12a3c9", "Cofnod Sengl", "fc29g5b9", "Single Record"],
      ["", "", "", ""],
      [],
    ])
    expect(list).toStrictEqual([
      {
        id: "fc29g5b9",
        name: { en: "Single Record", cy: "Cofnod Sengl" },
        colour: "#12a3c9",
      },
    ])
    expect(problems).toStrictEqual([])
  })

  it("is no list when the tab is missing (S6)", () => {
    expect(parseFamilies(null)).toStrictEqual({
      list: null,
      problems: [problem("missing-tab", {})],
    })
  })

  it.each(["ID", "Name", "Colour"])(
    "is no list when the %s column is missing (S6)",
    (missing) => {
      const header = FAMILY_HEADER.filter((column) => column !== missing)
      expect(parseFamilies([header, ["a", "b", "#000000"]])).toStrictEqual({
        list: null,
        problems: [problem("missing-column", { column: missing })],
      })
    },
  )

  it("is no list when the tab is empty", () => {
    expect(parseFamilies([]).list).toBeNull()
  })

  it("keeps the list without a Welsh column, recording it", () => {
    const { list, problems } = parseFamilies([
      ["ID", "Name", "Colour"],
      ["fc29g5b9", "Single Record", "#12a3c9"],
    ])
    expect(list).toStrictEqual([
      {
        id: "fc29g5b9",
        name: { en: "Single Record", cy: "" },
        colour: "#12a3c9",
      },
    ])
    expect(problems).toStrictEqual([
      problem("missing-column", { column: "Name (cy)" }),
    ])
  })

  it("skips a bad row, keeping the earlier row's ID or name, and loads the rest (S7)", () => {
    const { list, problems } = parseFamilies([
      FAMILY_HEADER,
      ["", "No ID", "", "#111111"],
      ["aaaaaaaa", "", "Dim enw", "#222222"],
      ["bbbbbbbb", "Bad colour", "", "#123"],
      ["cccccccc", "Blue", "", "blue"],
      ["dddddddd", "Single Record", "", "#12a3c9"],
      ["dddddddd", "Same ID", "", "#333333"],
      ["eeeeeeee", "single-record", "", "#444444"],
      ["bbbbbbbb", "Medicines", "", "#006747"],
    ])
    expect(list?.map(({ id, name }) => [id, name.en])).toStrictEqual([
      ["dddddddd", "Single Record"],
      ["bbbbbbbb", "Medicines"],
    ])
    expect(problems).toStrictEqual([
      problem("blank-id", { row: 2, column: "ID", value: "" }),
      problem("blank-name", { row: 3, column: "Name", value: "" }),
      problem("invalid-colour", { row: 4, column: "Colour", value: "#123" }),
      problem("invalid-colour", { row: 5, column: "Colour", value: "blue" }),
      problem("duplicate-id", { row: 7, column: "ID", value: "dddddddd" }),
      problem("duplicate-name", {
        row: 8,
        column: "Name",
        value: "single-record",
      }),
    ])
  })
})

describe("parseCategories", () => {
  it("reads each row as a category, with no colour", () => {
    expect(
      parseCategories([
        CATEGORY_HEADER,
        ["khzpchkh", "GP & Community Services", "Meddygon Teulu"],
      ]),
    ).toStrictEqual({
      list: [
        {
          id: "khzpchkh",
          name: { en: "GP & Community Services", cy: "Meddygon Teulu" },
        },
      ],
      problems: [],
    })
  })

  it("is no list when the tab is missing or lacks a column (S6)", () => {
    expect(parseCategories(null).list).toBeNull()
    expect(parseCategories([["ID", "Name (cy)"]])).toStrictEqual({
      list: null,
      problems: [problem("missing-column", { column: "Name" })],
    })
  })

  it("skips a row whose ID or folded name repeats an earlier one", () => {
    const { list, problems } = parseCategories([
      CATEGORY_HEADER,
      ["khzpchkh", "GP & Community Services", ""],
      ["khzpchkh", "Other", ""],
      ["w7vrv5kn", "gp community services", ""],
    ])
    expect(list?.map(({ id }) => id)).toStrictEqual(["khzpchkh"])
    expect(problems.map(({ code }) => code)).toStrictEqual([
      "duplicate-id",
      "duplicate-name",
    ])
  })
})
