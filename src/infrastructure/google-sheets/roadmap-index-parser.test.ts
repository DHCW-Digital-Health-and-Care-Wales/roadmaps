import { describe, expect, it } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { isAppError } from "@/lib/errors"

import roadmapsCsv from "../../../tests/fixtures/sheets/Roadmaps.csv?raw"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import {
  parseRoadmapIndex,
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
        title: { en: "Product A roadmap", cy: "" },
        published: true,
        category: "gp-community-services",
        family: { en: "Single Record", cy: "" },
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
        title: { en: "Product B roadmap", cy: "Trywydd Cynnyrch B" },
        published: true,
        category: null,
        family: {
          en: "Medicines & Diagnostics",
          cy: "Meddyginiaethau a Diagnosteg",
        },
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
        title: { en: "Product C roadmap", cy: "" },
        published: false,
        category: "tests-scans-results",
        family: null,
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
        createTestRoadmap("producta", "Product A roadmap"),
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
        createTestRoadmap("producta", "ProductA"),
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
        roadmap: createTestRoadmap("producta", "Product A roadmap", {
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
      ["Public Health & Apps", "public-health-apps"],
      ["GP & Community Services", "gp-community-services"],
      [" gp & community services", "gp-community-services"],
      ["Tests, Scans & Results", "tests-scans-results"],
      ["Urgent & Emergency Care", "urgent-emergency-care"],
      ["Hospital & Specialist Care", "hospital-specialist-care"],
      ["NATIONAL SYSTEMS AND DATA", null],
      ["National Systems & Data", "national-systems-data"],
      ["national-systems-data", "national-systems-data"],
    ])("reads the category %j as %j", (value, category) => {
      const index = parseRows({ Sheet: "A", Enabled: "Yes", Category: value })

      expect(index.entries[0]?.roadmap.category).toBe(category)
    })

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
        createTestRoadmap("producta", "ProductA"),
      )
      expect(index.problems).toEqual([])
    })
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
          roadmap: createTestRoadmap("producta", "ProductA"),
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
})

function blanks(count: number): string[] {
  return Array.from({ length: count }, () => "")
}
