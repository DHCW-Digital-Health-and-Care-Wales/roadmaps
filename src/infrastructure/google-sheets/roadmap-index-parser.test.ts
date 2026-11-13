import { describe, expect, it } from "vitest"

import type { Category } from "@/domain/roadmap/category"
import type { Family } from "@/domain/roadmap/family"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { isAppError } from "@/lib/errors"

import roadmapsCsv from "../../../tests/fixtures/sheets/Roadmaps.csv?raw"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import {
  parseRoadmapIndex,
  type RoadmapIndex,
  type RoadmapIndexProblem,
} from "./roadmap-index-parser"

/** Every column the roadmap index has, as the example spreadsheet spells them. */
const HEADER = [
  "Sheet",
  "Enabled",
  "Title",
  "Category",
  "Family",
  "Status label",
  "Last updated",
  "Colour",
  "Vision",
  "Service description",
  "Product Lead",
] as const

type Cells = Partial<Record<(typeof HEADER)[number], string>>

/** A row under the full header, given by its non-blank cells. */
function toRow(cells: Cells): string[] {
  return HEADER.map((column) => cells[column] ?? "")
}

/** Parses rows under the full header. */
function parseRows(...rows: Cells[]) {
  return parseRoadmapIndex([[...HEADER], ...rows.map(toRow)])
}

/** The full header with `column` spelled `as` instead. */
function headerWith(column: (typeof HEADER)[number], as: string): string[] {
  return HEADER.map((name) => (name === column ? as : name))
}

function problem(
  code: RoadmapIndexProblem["code"],
  { row = null, column = null, value = null }: Partial<RoadmapIndexProblem>,
): RoadmapIndexProblem {
  return { code, row, column, value }
}

function parseFailure(rows: string[][]): unknown {
  try {
    parseRoadmapIndex(rows)
  } catch (error) {
    return error
  }
  throw new Error("Expected the roadmap index to fail")
}

describe("parseRoadmapIndex", () => {
  describe("the example roadmap index (S1)", () => {
    const index = parseRoadmapIndex(parseCsv(roadmapsCsv))

    it("lists the three example roadmaps in row order, with their tab names", () => {
      expect(
        index.entries.map(({ roadmap, tabName }) => [roadmap.id, tabName]),
      ).toEqual([
        ["producta", "ProductA"],
        ["productb", "ProductB"],
        ["productc", "ProductC"],
      ])
      expect(index.problems).toEqual([])
    })

    it("reads everything the list holds about Product A", () => {
      expect(index.entries[0]?.roadmap).toEqual({
        id: "producta",
        itemsLocation: "ProductA",
        title: { en: "Product A roadmap", cy: "" },
        published: true,
        category: { en: "GP & Community Services", cy: "" },
        categoryId: null,
        family: { en: "Single Record", cy: "" },
        familyId: null,
        copied: {
          family: { en: "Single Record", cy: "" },
          colour: "#325083",
          category: "GP & Community Services",
        },
        outOfStep: false,
        familyNotListed: false,
        statusLabel: { en: "Beta", cy: "" },
        productLead: "Alex Jones",
        lastUpdated: "2026-10-01",
        colour: "#325083",
        vision: {
          en: "A short, ambitious statement of where Product A is heading. Leave blank to show a general intro sentence instead.",
          cy: "",
        },
        serviceDescription: {
          en: "What Product A does and who it helps. Also used as the summary on the landing page card.",
          cy: "",
        },
      })
    })

    it("reads Product B's Welsh, its UK date and its blank category and vision", () => {
      expect(index.entries[1]?.roadmap).toEqual({
        id: "productb",
        itemsLocation: "ProductB",
        title: { en: "Product B roadmap", cy: "Trywydd Cynnyrch B" },
        published: true,
        category: null,
        categoryId: null,
        family: {
          en: "Medicines & Diagnostics",
          cy: "Meddyginiaethau a Diagnosteg",
        },
        familyId: null,
        copied: {
          family: {
            en: "Medicines & Diagnostics",
            cy: "Meddyginiaethau a Diagnosteg",
          },
          colour: "#006747",
          category: "",
        },
        outOfStep: false,
        familyNotListed: false,
        statusLabel: { en: "Alpha", cy: "Alffa" },
        productLead: null,
        lastUpdated: "2026-09-15",
        colour: "#006747",
        vision: null,
        serviceDescription: {
          en: "What Product B does and who it helps. This roadmap has no vision, so a general intro sentence shows instead.",
          cy: "Beth mae Cynnyrch B yn ei wneud a phwy mae’n ei helpu. Nid oes gan y trywydd hwn weledigaeth, felly mae brawddeg gyflwyno gyffredinol yn ymddangos yn lle hynny.",
        },
      })
    })

    it("reads Product C as not published", () => {
      expect(index.entries[2]?.roadmap).toEqual({
        id: "productc",
        itemsLocation: "ProductC",
        title: { en: "Product C roadmap", cy: "" },
        published: false,
        category: { en: "Tests, Scans & Results", cy: "" },
        categoryId: null,
        family: null,
        familyId: null,
        copied: {
          family: null,
          colour: "#912b88",
          category: "Tests, Scans & Results",
        },
        outOfStep: false,
        familyNotListed: false,
        statusLabel: { en: "Alpha", cy: "" },
        productLead: "Sam Evans",
        lastUpdated: "2026-10-01",
        colour: "#912b88",
        vision: null,
        serviceDescription: {
          en: "Not published because Enabled is not exactly Yes.",
          cy: "",
        },
      })
    })
  })

  describe("headers (S2)", () => {
    const cells = toRow({
      Sheet: "ProductA",
      Enabled: "Yes",
      Title: "Product A roadmap",
      "Status label": "Beta",
      "Last updated": "2026-10-01",
      "Product Lead": "Alex Jones",
    })

    it.each([
      ["Status label", "STATUS LABEL"],
      ["Status label", "Status-label"],
      ["Product Lead", "product lead"],
      ["Sheet", "  sheet  "],
      ["Last updated", "Last_Updated"],
    ] as const)(
      "matches %s spelled %j, ignoring case, spaces and punctuation",
      (column, spelling) => {
        const header = headerWith(column, spelling)

        const index = parseRoadmapIndex([header, cells])

        expect(index.entries[0]?.roadmap).toMatchObject({
          id: "producta",
          statusLabel: { en: "Beta", cy: "" },
          productLead: "Alex Jones",
          lastUpdated: "2026-10-01",
        })
        expect(index.problems).toEqual([])
      },
    )

    it.each([
      "Title (Welsh)",
      "Title - Cymraeg",
      "Title (cy)",
      "TITLE(CY)",
      "Title_cym",
    ])("reads %j as the Welsh title", (welshHeader) => {
      const index = parseRoadmapIndex([
        [...HEADER, welshHeader],
        ["ProductA", "Yes", "Product A roadmap", ...blanks(8), "Teitl"],
      ])

      expect(index.entries[0]?.roadmap.title).toEqual({
        en: "Product A roadmap",
        cy: "Teitl",
      })
      expect(index.problems).toEqual([])
    })

    it("ignores an unknown column without recording a problem", () => {
      const index = parseRoadmapIndex([
        [...HEADER, "Notes"],
        ["ProductA", "Yes", "Product A roadmap", ...blanks(8), "Internal"],
      ])

      expect(index.entries[0]?.roadmap).toEqual(
        createTestRoadmap("producta", "Product A roadmap", {
          itemsLocation: "ProductA",
        }),
      )
      expect(index.problems).toEqual([])
    })

    it("uses the first of two headers for the same column, recording the second", () => {
      const index = parseRoadmapIndex([
        [...HEADER, "STATUS LABEL"],
        ["ProductA", "Yes", "", "", "", "Beta", ...blanks(5), "Live"],
      ])

      expect(index.entries[0]?.roadmap.statusLabel).toEqual({
        en: "Beta",
        cy: "",
      })
      expect(index.problems).toEqual([
        problem("duplicate-column", { row: 1, column: "STATUS LABEL" }),
      ])
    })

    it("ignores a Welsh header for a column with no Welsh, recording each", () => {
      const index = parseRoadmapIndex([
        [...HEADER, "Colour (cy)", "Product Lead (cy)"],
        [
          "ProductA",
          "Yes",
          ...blanks(5),
          "#325083",
          "",
          "",
          "Alex Jones",
          "#000000",
          "Alex Jones (cy)",
        ],
      ])

      expect(index.entries[0]?.roadmap).toMatchObject({
        colour: "#325083",
        productLead: "Alex Jones",
      })
      expect(index.problems).toEqual([
        problem("welsh-column-not-allowed", { row: 1, column: "Colour (cy)" }),
        problem("welsh-column-not-allowed", {
          row: 1,
          column: "Product Lead (cy)",
        }),
      ])
    })

    it("records each missing column other than Sheet, in the list's order", () => {
      const index = parseRoadmapIndex([
        ["Sheet", "Enabled"],
        ["ProductA", "Yes"],
      ])

      expect(index.entries.map(({ roadmap }) => roadmap)).toEqual([
        createTestRoadmap("producta", "ProductA", {
          itemsLocation: "ProductA",
        }),
      ])
      expect(index.problems).toEqual(
        [
          "Title",
          "Category",
          "Family",
          "Status label",
          "Last updated",
          "Colour",
          "Vision",
          "Service description",
          "Product Lead",
        ].map((column) => problem("missing-column", { column })),
      )
    })
  })

  describe("values (S3)", () => {
    it("trims every cell, keeping line breaks inside text", () => {
      const index = parseRows({
        Sheet: "  ProductA ",
        Enabled: " Yes ",
        Title: "  Product A roadmap\t",
        Vision: "  Line one\nLine two  ",
        "Product Lead": " Alex Jones ",
      })

      expect(index.entries[0]).toEqual({
        tabName: "ProductA",
        row: 2,
        roadmap: createTestRoadmap("producta", "Product A roadmap", {
          itemsLocation: "ProductA",
          vision: { en: "Line one\nLine two", cy: "" },
          productLead: "Alex Jones",
        }),
      })
      expect(index.problems).toEqual([])
    })

    it("titles a roadmap with a blank title by its Sheet value", () => {
      const index = parseRows({ Sheet: "Product A", Enabled: "Yes" })

      expect(index.entries[0]?.roadmap.title).toEqual({
        en: "Product A",
        cy: "",
      })
    })

    it("keeps a Welsh title when the English title falls back to the Sheet value", () => {
      const index = parseRoadmapIndex([
        [...HEADER, "Title (cy)"],
        ["ProductA", "Yes", ...blanks(9), "Teitl"],
      ])

      expect(index.entries[0]?.roadmap.title).toEqual({
        en: "ProductA",
        cy: "Teitl",
      })
      expect(index.problems).toEqual([])
    })

    it("publishes only an Enabled of exactly Yes, recording any value but No and blank", () => {
      const index = parseRows(
        { Sheet: "A", Enabled: "Yes" },
        { Sheet: "B", Enabled: "No" },
        { Sheet: "C", Enabled: "yes" },
        { Sheet: "D", Enabled: "" },
        { Sheet: "E", Enabled: "TRUE" },
      )

      expect(
        index.entries.map(({ roadmap }) => [roadmap.id, roadmap.published]),
      ).toEqual([
        ["a", true],
        ["b", false],
        ["c", false],
        ["d", false],
        ["e", false],
      ])
      expect(index.problems).toEqual([
        problem("enabled-not-yes", { row: 4, column: "Enabled", value: "yes" }),
        problem("enabled-not-yes", {
          row: 6,
          column: "Enabled",
          value: "TRUE",
        }),
      ])
    })

    it.each([
      ["Public Health & Apps", "Public Health & Apps"],
      ["GP & Community Services", "GP & Community Services"],
      [" gp & community services", "GP & Community Services"],
      ["Tests, Scans & Results", "Tests, Scans & Results"],
      ["Urgent & Emergency Care", "Urgent & Emergency Care"],
      ["Hospital & Specialist Care", "Hospital & Specialist Care"],
      ["NATIONAL SYSTEMS AND DATA", null],
      ["National Systems & Data", "National Systems & Data"],
      ["national-systems-data", "National Systems & Data"],
    ])(
      "with no category list, reads the category %j as the public site's %j, in English only (S6)",
      (value, name) => {
        const index = parseRows({ Sheet: "A", Enabled: "Yes", Category: value })

        expect(index.entries[0]?.roadmap.category).toStrictEqual(
          name === null ? null : { en: name, cy: "" },
        )
      },
    )

    it("reads an unknown category as none, recording it, and a blank one as none", () => {
      const index = parseRows(
        { Sheet: "A", Enabled: "Yes", Category: "Mental Health" },
        { Sheet: "B", Enabled: "Yes", Category: "" },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.category)).toEqual([
        null,
        null,
      ])
      expect(index.problems).toEqual([
        problem("unknown-category", {
          row: 2,
          column: "Category",
          value: "Mental Health",
        }),
      ])
    })

    it.each([
      ["2026-10-01", "2026-10-01"],
      ["01/10/2026", "2026-10-01"],
      ["2026-1-5", "2026-01-05"],
      ["5/1/2026", "2026-01-05"],
      ["29/02/2024", "2024-02-29"],
    ])("reads the date %j as %j", (value, date) => {
      const index = parseRows({
        Sheet: "A",
        Enabled: "Yes",
        "Last updated": value,
      })

      expect(index.entries[0]?.roadmap.lastUpdated).toBe(date)
      expect(index.problems).toEqual([])
    })

    it.each([
      "31/02/2026",
      "1 Oct 2026",
      "2026-13-01",
      "29/02/2026",
      "10/01/26",
    ])("reads the date %j as none, recording it", (value) => {
      const index = parseRows({
        Sheet: "A",
        Enabled: "Yes",
        "Last updated": value,
      })

      expect(index.entries[0]?.roadmap.lastUpdated).toBeNull()
      expect(index.problems).toEqual([
        problem("invalid-date", { row: 2, column: "Last updated", value }),
      ])
    })

    it("reads a six-digit colour in lower case", () => {
      const index = parseRows({ Sheet: "A", Enabled: "Yes", Colour: "#ABCDEF" })

      expect(index.entries[0]?.roadmap.colour).toBe("#abcdef")
      expect(index.problems).toEqual([])
    })

    it("expands a three-digit colour, recording it, since the public site rejects one", () => {
      const index = parseRows({ Sheet: "A", Enabled: "Yes", Colour: "#ABC" })

      expect(index.entries[0]?.roadmap.colour).toBe("#aabbcc")
      expect(index.problems).toEqual([
        problem("short-colour", { row: 2, column: "Colour", value: "#ABC" }),
      ])
    })

    it.each(["red", "url(x)", "#12345", "325083"])(
      "reads the colour %j as none, recording it",
      (value) => {
        const index = parseRows({ Sheet: "A", Enabled: "Yes", Colour: value })

        expect(index.entries[0]?.roadmap.colour).toBeNull()
        expect(index.problems).toEqual([
          problem("invalid-colour", { row: 2, column: "Colour", value }),
        ])
      },
    )

    it("drops Welsh with no English, recording it", () => {
      const index = parseRoadmapIndex([
        [...HEADER, "Family (cy)", "Vision (cy)"],
        ["ProductA", "Yes", ...blanks(9), "Teulu", "Gweledigaeth"],
      ])

      expect(index.entries[0]?.roadmap).toMatchObject({
        family: null,
        vision: null,
      })
      expect(index.problems).toEqual([
        problem("welsh-without-english", {
          row: 2,
          column: "Family (cy)",
          value: "Teulu",
        }),
        problem("welsh-without-english", {
          row: 2,
          column: "Vision (cy)",
          value: "Gweledigaeth",
        }),
      ])
    })

    it("reads blank optional cells as none, without recording a problem", () => {
      const index = parseRows({ Sheet: "ProductA", Enabled: "Yes" })

      expect(index.entries[0]?.roadmap).toEqual(
        createTestRoadmap("producta", "ProductA", {
          itemsLocation: "ProductA",
        }),
      )
      expect(index.problems).toEqual([])
    })
  })

  it("returns where each English column is, and Family (cy), found by header", () => {
    const index = parseRoadmapIndex([
      ["Vision (cy)", " sheet ", "Vision", "Title", "family - cymraeg"],
      ["", "ProductA"],
    ])
    expect(index.columns).toEqual(
      new Map([
        ["Sheet", 1],
        ["Vision", 2],
        ["Title", 3],
        ["Family (cy)", 4],
      ]),
    )
  })

  describe("bad rows (S4)", () => {
    it("ignores blank rows, short or not, and rows with a blank Sheet", () => {
      const index = parseRoadmapIndex([
        [...HEADER],
        [],
        blanks(11),
        ["", "Yes", "A roadmap with no tab"],
        ["ProductA", "Yes"],
      ])

      expect(index.entries).toEqual([
        {
          tabName: "ProductA",
          row: 5,
          roadmap: createTestRoadmap("producta", "ProductA", {
            itemsLocation: "ProductA",
          }),
        },
      ])
      expect(index.problems).toEqual([])
    })

    it("ignores cells beyond the header", () => {
      const index = parseRoadmapIndex([
        [...HEADER],
        [...blanks(11), "ProductA"],
      ])

      expect(index.entries).toEqual([])
    })

    it("keeps the first of two rows with the same id and skips the other, recording it", () => {
      const index = parseRows(
        { Sheet: "Product A", Enabled: "Yes", Title: "First" },
        { Sheet: "ProductB", Enabled: "Yes" },
        { Sheet: "product-a", Enabled: "Yes", Title: "Second" },
      )

      expect(
        index.entries.map(({ roadmap, tabName }) => [
          roadmap.id,
          tabName,
          roadmap.title.en,
        ]),
      ).toEqual([
        ["product-a", "Product A", "First"],
        ["productb", "ProductB", "ProductB"],
      ])
      expect(index.problems).toEqual([
        problem("duplicate-id", {
          row: 4,
          column: "Sheet",
          value: "product-a",
        }),
      ])
    })

    it("skips a row whose Sheet gives no id, recording it", () => {
      const index = parseRows(
        { Sheet: "---", Enabled: "Yes" },
        { Sheet: "ProductA", Enabled: "Yes" },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.id)).toEqual([
        "producta",
      ])
      expect(index.problems).toEqual([
        problem("invalid-id", { row: 2, column: "Sheet", value: "---" }),
      ])
    })

    it("makes the id from the Sheet value as the public site does", () => {
      const index = parseRows(
        { Sheet: "Ap GIG Cymru — Ŵyl", Enabled: "Yes" },
        { Sheet: "  -Product   A_2027- ", Enabled: "Yes" },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.id)).toEqual([
        "ap-gig-cymru-wyl",
        "product-a-2027",
      ])
    })

    it("lists every roadmap as not published when there is no Enabled column, recording one problem", () => {
      const header = HEADER.filter((column) => column !== "Enabled")
      const index = parseRoadmapIndex([header, ["ProductA"], ["ProductB"]])

      expect(
        index.entries.map(({ roadmap }) => [roadmap.id, roadmap.published]),
      ).toEqual([
        ["producta", false],
        ["productb", false],
      ])
      expect(index.problems).toEqual([
        problem("missing-column", { column: "Enabled" }),
      ])
    })

    it("records a list in which no roadmap is published", () => {
      const index = parseRows({ Sheet: "ProductA", Enabled: "No" })

      expect(index.entries).toHaveLength(1)
      expect(index.problems).toEqual([problem("no-published-roadmap", {})])
    })
  })

  describe("a roadmap whose tab is missing", () => {
    it("keeps the roadmap and records its missing tab, matching tab titles exactly", () => {
      const index = parseRoadmapIndex(
        [
          [...HEADER],
          toRow({ Sheet: "ProductA", Enabled: "Yes" }),
          toRow({ Sheet: "ProductB", Enabled: "Yes" }),
          toRow({ Sheet: "productc", Enabled: "No" }),
        ],
        { tabTitles: ["Roadmaps", "ProductA", "ProductC"] },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.id)).toEqual([
        "producta",
        "productb",
        "productc",
      ])
      expect(index.problems).toEqual([
        problem("missing-tab", { row: 3, column: "Sheet", value: "ProductB" }),
        problem("missing-tab", { row: 4, column: "Sheet", value: "productc" }),
      ])
    })

    it("does not check the tab of a skipped row", () => {
      const index = parseRoadmapIndex(
        [
          [...HEADER],
          toRow({ Sheet: "ProductA", Enabled: "Yes" }),
          toRow({ Sheet: "PRODUCTA", Enabled: "No" }),
        ],
        { tabTitles: ["ProductA"] },
      )

      expect(index.problems.map(({ code }) => code)).toEqual(["duplicate-id"])
    })

    it("checks no tabs when it is not given the tab titles", () => {
      const index = parseRows({ Sheet: "ProductA", Enabled: "Yes" })

      expect(index.problems).toEqual([])
    })
  })

  describe("an unreadable list (S5)", () => {
    it.each([
      ["no rows", []],
      [
        "a header with no Sheet column",
        [
          ["Title", "Enabled"],
          ["Product A", "Yes"],
        ],
      ],
      ["a blank header", [[], ["ProductA", "Yes"]]],
      [
        "only a Welsh Sheet header",
        [
          ["Sheet (cy)", "Enabled"],
          ["ProductA", "Yes"],
        ],
      ],
    ])("fails with invalid-data, not retryable, for %s", (_, rows) => {
      const error = parseFailure(rows)

      expect(isAppError(error)).toBe(true)
      expect(error).toMatchObject({ kind: "invalid-data", retryable: false })
    })

    it("lists no roadmaps, without failing, for a header with no rows", () => {
      const index = parseRoadmapIndex([[...HEADER]])

      expect(index.entries).toEqual([])
      expect(index.problems).toEqual([problem("no-published-roadmap", {})])
    })
  })

  describe("rows with the same id (S7)", () => {
    it("keeps the published row over a draft above it, recording the draft", () => {
      const index = parseRows(
        { Sheet: "Product A", Enabled: "No", Title: "Draft" },
        { Sheet: "product-a", Enabled: "Yes", Title: "Live" },
      )

      expect(index.entries).toEqual([
        {
          tabName: "product-a",
          row: 3,
          roadmap: createTestRoadmap("product-a", "Live"),
        },
      ])
      expect(index.problems).toEqual([
        problem("duplicate-id", {
          row: 2,
          column: "Sheet",
          value: "Product A",
        }),
      ])
    })

    it("gives every row with an id, skipped ones too, without their own problems (STY-035)", () => {
      const index = parseRows(
        { Sheet: "Product A", Enabled: "No", Title: "Draft", Colour: "#abc" },
        { Sheet: "product-a", Enabled: "Yes", Title: "Live" },
        { Sheet: "!!", Enabled: "Yes", Title: "No id" },
      )

      expect(index.everyEntry).toEqual([
        {
          tabName: "Product A",
          row: 2,
          roadmap: createTestRoadmap("product-a", "Draft", {
            itemsLocation: "Product A",
            published: false,
            colour: "#aabbcc",
          }),
        },
        ...index.entries,
      ])
      expect(index.problems.map(({ code }) => code)).toEqual([
        "duplicate-id",
        "invalid-id",
      ])
    })

    it("keeps the first published row among several, recording the others", () => {
      const index = parseRows(
        { Sheet: "ProductA", Enabled: "No", Title: "Draft" },
        { Sheet: "productA", Enabled: "Yes", Title: "Live" },
        { Sheet: "PRODUCTA", Enabled: "Yes", Title: "Copy" },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.title.en)).toEqual([
        "Live",
      ])
      expect(index.problems).toEqual([
        problem("duplicate-id", { row: 2, column: "Sheet", value: "ProductA" }),
        problem("duplicate-id", { row: 4, column: "Sheet", value: "PRODUCTA" }),
      ])
    })

    it("keeps the first row when none is published", () => {
      const index = parseRows(
        { Sheet: "ProductA", Enabled: "No", Title: "First" },
        { Sheet: "productA", Enabled: "", Title: "Second" },
      )

      expect(index.entries.map(({ roadmap }) => roadmap.title.en)).toEqual([
        "First",
      ])
      expect(index.problems).toEqual([
        problem("no-published-roadmap", {}),
        problem("duplicate-id", { row: 3, column: "Sheet", value: "productA" }),
      ])
    })
  })

  describe("the family and category lists (ADR-013)", () => {
    const SINGLE_RECORD = {
      id: "fc29g5b9",
      name: { en: "Single Record", cy: "Cofnod Sengl" },
      colour: "#12a3c9",
    }
    const MEDICINES = {
      id: "vdkxj63m",
      name: { en: "Medicines & Diagnostics", cy: "" },
      colour: "#006747",
    }
    const GP = {
      id: "khzpchkh",
      name: { en: "GP & Community Services", cy: "Meddygon Teulu" },
    }
    const TESTS = {
      id: "w7vrv5kn",
      name: { en: "Tests, Scans & Results", cy: "Profion" },
    }
    const LIST_HEADER = [
      "Sheet",
      "Enabled",
      "Family ID",
      "Family",
      "Family (cy)",
      "Colour",
      "Category ID",
      "Category",
    ] as const
    type ListCells = Partial<Record<(typeof LIST_HEADER)[number], string>>

    /** Parses published rows under a header with the editor's ID columns. */
    function parseWithLists(
      rows: ListCells[],
      {
        families = [SINGLE_RECORD, MEDICINES],
        categories = [GP, TESTS],
      }: {
        families?: Family[] | null
        categories?: Category[] | null
      } = {},
    ) {
      const toRow = (cells: ListCells, i: number) =>
        LIST_HEADER.map((column) => {
          if (column === "Sheet") return `R${String(i)}`
          if (column === "Enabled") return "Yes"
          return cells[column] ?? ""
        })
      const index = parseRoadmapIndex([[...LIST_HEADER], ...rows.map(toRow)], {
        families,
        categories,
      })
      // The columns this header leaves out are not what these tests are about.
      return {
        ...index,
        problems: index.problems.filter(
          ({ code }) => code !== "missing-column",
        ),
      }
    }

    /** The family and category fields of each roadmap. */
    const linksOf = (index: RoadmapIndex) =>
      index.entries.map(({ roadmap }) => ({
        family: roadmap.family,
        familyId: roadmap.familyId,
        colour: roadmap.colour,
        category: roadmap.category,
        categoryId: roadmap.categoryId,
        outOfStep: roadmap.outOfStep,
        familyNotListed: roadmap.familyNotListed,
      }))

    const IN_STEP: ListCells = {
      "Family ID": SINGLE_RECORD.id,
      Family: "Single Record",
      "Family (cy)": "Cofnod Sengl",
      Colour: "#12A3C9",
      "Category ID": GP.id,
      Category: "GP & Community Services",
    }
    const LINKED = {
      family: SINGLE_RECORD.name,
      familyId: SINGLE_RECORD.id,
      colour: SINGLE_RECORD.colour,
      category: GP.name,
      categoryId: GP.id,
      outOfStep: false,
      familyNotListed: false,
    }

    it("shows a row whose cells match its family and category, not flagged (S4)", () => {
      const index = parseWithLists([IN_STEP])

      expect(linksOf(index)).toStrictEqual([LINKED])
      expect(index.problems).toStrictEqual([])
    })

    it("shows the family's name and colour over the row's own, flagged (S2, S4)", () => {
      const index = parseWithLists([
        { Family: "Single record", Colour: "#325083" },
      ])

      expect(linksOf(index)).toStrictEqual([
        { ...LINKED, category: null, categoryId: null, outOfStep: true },
      ])
    })

    it.each<[string, ListCells]>([
      ["Family", { Family: "Single record" }],
      ["Family (cy)", { "Family (cy)": "" }],
      ["Colour", { Colour: "#325083" }],
      ["Colour, written short", { Colour: "#abc" }],
      ["Category", { Category: "gp community services" }],
    ])("flags a row whose %s differs from the list (S4)", (_, cells) => {
      const [roadmap] = linksOf(parseWithLists([{ ...IN_STEP, ...cells }]))

      expect(roadmap).toStrictEqual({ ...LINKED, outOfStep: true })
    })

    it("links by ID over the name, and by folded name when there is no ID (S3)", () => {
      const index = parseWithLists([
        {
          "Family ID": SINGLE_RECORD.id,
          Family: "Medicines & Diagnostics",
          "Category ID": TESTS.id,
          Category: "GP & Community Services",
        },
        { Family: "single-record", Category: "TESTS SCANS RESULTS" },
      ])

      expect(
        linksOf(index).map(({ familyId, categoryId }) => [
          familyId,
          categoryId,
        ]),
      ).toStrictEqual([
        [SINGLE_RECORD.id, TESTS.id],
        [SINGLE_RECORD.id, TESTS.id],
      ])
      expect(index.problems).toStrictEqual([])
    })

    it("links by name when the ID is not in the list, recording the ID", () => {
      const index = parseWithLists([
        { ...IN_STEP, "Family ID": "zzzzzzzz", "Category ID": "yyyyyyyy" },
      ])

      expect(linksOf(index)).toStrictEqual([LINKED])
      expect(index.problems).toStrictEqual([
        problem("unknown-family-id", {
          row: 2,
          column: "Family ID",
          value: "zzzzzzzz",
        }),
        problem("unknown-category-id", {
          row: 2,
          column: "Category ID",
          value: "yyyyyyyy",
        }),
      ])
    })

    it("keeps a family the list doesn't have as the row names it, flagged and recorded (S8)", () => {
      const index = parseWithLists([
        { Family: "Single Recrod", "Family (cy)": "Cofnod", Colour: "#325083" },
      ])

      expect(linksOf(index)).toStrictEqual([
        {
          family: { en: "Single Recrod", cy: "Cofnod" },
          familyId: null,
          colour: "#325083",
          category: null,
          categoryId: null,
          outOfStep: false,
          familyNotListed: true,
        },
      ])
      expect(index.problems).toStrictEqual([
        problem("unknown-family", {
          row: 2,
          column: "Family",
          value: "Single Recrod",
        }),
      ])
    })

    it("keeps the own colour of a roadmap with no family, not flagged (S9)", () => {
      const [roadmap] = linksOf(parseWithLists([{ Colour: "#7B2D8E" }]))

      expect(roadmap).toMatchObject({
        family: null,
        colour: "#7b2d8e",
        outOfStep: false,
        familyNotListed: false,
      })
    })

    it("reads a category the list doesn't have as none, recording it (S10)", () => {
      const index = parseWithLists([
        { Category: "Public Health & Apps" },
        { Category: "" },
      ])

      expect(linksOf(index).map(({ category }) => category)).toStrictEqual([
        null,
        null,
      ])
      expect(index.problems).toStrictEqual([
        problem("unknown-category", {
          row: 2,
          column: "Category",
          value: "Public Health & Apps",
        }),
      ])
    })

    it("with no lists, reads the row's own cells, with no flags (S6)", () => {
      const index = parseWithLists(
        [{ ...IN_STEP, Family: "Single record", Colour: "#325083" }],
        { families: null, categories: null },
      )

      expect(linksOf(index)).toStrictEqual([
        {
          family: { en: "Single record", cy: "Cofnod Sengl" },
          familyId: null,
          colour: "#325083",
          category: { en: "GP & Community Services", cy: "" },
          categoryId: null,
          outOfStep: false,
          familyNotListed: false,
        },
      ])
      expect(index.problems).toStrictEqual([])
    })
  })
})

function blanks(count: number): string[] {
  return Array.from({ length: count }, () => "")
}
