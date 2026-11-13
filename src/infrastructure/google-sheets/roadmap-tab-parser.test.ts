import { describe, expect, it } from "vitest"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { isAppError } from "@/lib/errors"

import productACsv from "../../../tests/fixtures/sheets/ProductA.csv?raw"
import { parseCsv } from "../../../tests/fixtures/sheets/parse-csv"
import {
  parseRoadmapTab,
  roadmapTabColumns,
  type RoadmapTabProblem,
} from "./roadmap-tab-parser"

/** Every column a roadmap tab has, in the Template's order. */
const HEADER = [
  "Title",
  "Description",
  "Outcome",
  "Horizon",
  "Phase",
  "Labels",
  "Organisations",
  "Details",
  "Title (cy)",
  "Description (cy)",
  "Outcome (cy)",
  "Phase (cy)",
  "Labels (cy)",
  "Details (cy)",
] as const

type Cells = Partial<Record<(typeof HEADER)[number], string>>

/** Parses rows under `header`, each given by its non-blank cells. */
function parseUnder(header: readonly string[], ...rows: Cells[]) {
  return parseRoadmapTab([
    [...header],
    ...rows.map((cells) =>
      header.map((column) => cells[column as keyof Cells] ?? ""),
    ),
  ])
}

/** Parses rows under the full header. */
const parseRows = (...rows: Cells[]) => parseUnder(HEADER, ...rows)

/** The full header without `columns`. */
const headerWithout = (...columns: string[]) =>
  HEADER.filter((name) => !columns.includes(name))

function problem(
  code: RoadmapTabProblem["code"],
  { row = null, column = null, value = null }: Partial<RoadmapTabProblem>,
): RoadmapTabProblem {
  return { code, row, column, value }
}

function parseFailure(rows: string[][]): unknown {
  try {
    parseRoadmapTab(rows)
  } catch (error) {
    return error
  }
  throw new Error("Expected the roadmap tab to fail")
}

describe("parseRoadmapTab", () => {
  describe("the example roadmap tab (S1)", () => {
    const tab = parseRoadmapTab(parseCsv(productACsv))

    it("returns its nine items in row order, with their placements", () => {
      expect(tab.items.map((item) => item.placement)).toEqual([
        "now",
        "now",
        "now",
        "next",
        "later",
        "later",
        "recently-delivered",
        "delivered-this-year",
        "not-doing",
      ])
      expect(tab.problems).toEqual([])
    })

    it("reads every column of the first item", () => {
      expect(tab.items[0]).toEqual({
        id: null,
        title: {
          en: "Example card with every column",
          cy: "Cerdyn enghreifftiol gyda phob colofn",
        },
        placement: "now",
        writtenHorizon: null,
        description: {
          en: "What this work is. Keep it to a sentence or two.",
          cy: "Beth yw’r gwaith hwn. Cadwch ef i frawddeg neu ddwy.",
        },
        expectedOutcome: {
          en: "What changes for users when it is done.",
          cy: "Beth sy’n newid i ddefnyddwyr pan fydd wedi’i gwblhau.",
        },
        phase: { en: "Beta", cy: "Beta" },
        tags: [
          { en: "Service X", cy: "Gwasanaeth X" },
          { en: "Service Y", cy: "Gwasanaeth Y" },
        ],
        organisationIds: ["cavuhb", "sbuhb"],
        unknownOrganisationCodes: [],
        details: [
          {
            level: 0,
            text: { en: "First bullet point", cy: "Pwynt bwled cyntaf" },
          },
          {
            level: 1,
            text: {
              en: 'Start a line with "-" to nest it under the line above',
              cy: 'Dechreuwch linell gyda "-" i’w nythu o dan y llinell uchod',
            },
          },
          {
            level: 2,
            text: {
              en: "Use two dashes to nest it again",
              cy: "Defnyddiwch ddau gysylltnod i’w nythu eto",
            },
          },
          {
            level: 0,
            text: {
              en: "Another top-level bullet point",
              cy: "Pwynt bwled lefel uchaf arall",
            },
          },
        ],
      })
    })

    it("reads a minimal item with nothing but its title, horizon and description", () => {
      expect(tab.items[1]).toEqual(
        createTestRoadmapItem("Minimal card", {
          description: {
            en: "Only Title and Horizon are required; everything else is optional.",
            cy: "",
          },
        }),
      )
    })

    it("reads a Welsh description and outcome", () => {
      const discovery = tab.items[4]
      expect(discovery?.title.en).toBe("Discovery card")
      expect(discovery?.description?.cy).toBe(
        "Mae’r golofn Phase yn dag testun rhydd a ddangosir uwchben y teitl.",
      )
      expect(discovery?.expectedOutcome).toEqual({
        en: "A clear understanding of the problem.",
        cy: "Dealltwriaeth glir o’r broblem.",
      })
    })
  })

  describe("headers (S2)", () => {
    it("finds each column by its header, in any order and spelling", () => {
      const tab = parseRoadmapTab([
        [
          "Notes",
          "Labels - Cymraeg",
          "outcome",
          "Title",
          "Phase (Welsh)",
          "HORIZON",
          "Labels",
          "Phase",
        ],
        [
          "A note",
          "Tag Cymraeg",
          "An outcome",
          "An item",
          "Darganfod",
          "Next",
          "A tag",
          "Discovery",
        ],
      ])
      expect(tab.items).toEqual([
        createTestRoadmapItem("An item", {
          placement: "next",
          expectedOutcome: { en: "An outcome", cy: "" },
          phase: { en: "Discovery", cy: "Darganfod" },
          tags: [{ en: "A tag", cy: "Tag Cymraeg" }],
        }),
      ])
    })

    it("reads the first of two headers for a column and records the second", () => {
      const tab = parseRoadmapTab([
        ["Title", "Horizon", "Phase", "phase", "Phase (cy)", "Phase - Welsh"],
        ["An item", "Now", "Beta", "Alpha", "Beta cy", "Alffa"],
      ])
      expect(tab.items[0]?.phase).toEqual({ en: "Beta", cy: "Beta cy" })
      expect(tab.problems).toContainEqual(
        problem("duplicate-column", { row: 1, column: "phase" }),
      )
      expect(tab.problems).toContainEqual(
        problem("duplicate-column", { row: 1, column: "Phase - Welsh" }),
      )
    })

    it("ignores and records a Welsh header for Horizon or Organisations", () => {
      const tab = parseRoadmapTab([
        [
          "Title",
          "Horizon",
          "Organisations",
          "Horizon (cy)",
          "Organisations (cy)",
        ],
        ["An item", "Now", "PHW", "Nawr", "ICC"],
      ])
      expect(tab.items[0]).toEqual(
        createTestRoadmapItem("An item", { organisationIds: ["phw"] }),
      )
      expect(tab.problems).toEqual(
        expect.arrayContaining([
          problem("welsh-column-not-allowed", {
            row: 1,
            column: "Horizon (cy)",
          }),
          problem("welsh-column-not-allowed", {
            row: 1,
            column: "Organisations (cy)",
          }),
        ]),
      )
    })
  })

  describe("horizons (S3, S9)", () => {
    it("keeps an item with a blank or unknown horizon, unplaced, with its horizon as written", () => {
      const tab = parseRows(
        { Title: "Blank" },
        { Title: "Unknown", Horizon: "Soon" },
        { Title: "Spaced", Horizon: "recently  delivered" },
        { Title: "Shouted", Horizon: "NOT-DOING" },
      )
      expect(
        tab.items.map(({ placement, writtenHorizon }) => [
          placement,
          writtenHorizon,
        ]),
      ).toEqual([
        [null, ""],
        [null, "Soon"],
        ["recently-delivered", null],
        ["not-doing", null],
      ])
      expect(tab.problems).toEqual([
        problem("missing-horizon", { row: 2, column: "Horizon", value: "" }),
        problem("unknown-horizon", {
          row: 3,
          column: "Horizon",
          value: "Soon",
        }),
      ])
    })

    it("keeps a placed item's written horizon null (S9)", () => {
      const tab = parseRows(
        { Title: "Soon", Horizon: "Soon" },
        { Title: "Blank" },
        { Title: "Now", Horizon: "Now" },
      )
      expect(tab.items.map((item) => item.writtenHorizon)).toEqual([
        "Soon",
        "",
        null,
      ])
      expect(tab.items[2]?.placement).toBe("now")
    })

    it("leaves every item unplaced, recording one problem, when there is no Horizon column", () => {
      const tab = parseUnder(
        headerWithout("Horizon"),
        { Title: "One" },
        { Title: "Two" },
      )
      expect(
        tab.items.map(({ placement, writtenHorizon }) => [
          placement,
          writtenHorizon,
        ]),
      ).toEqual([
        [null, ""],
        [null, ""],
      ])
      expect(tab.problems).toEqual([
        problem("missing-column", { column: "Horizon" }),
      ])
    })
  })

  describe("item IDs (S1 to S5, STY-022)", () => {
    const ID_HEADER = ["Item ID", ...HEADER]
    const withIds = (...rows: (Cells & { "Item ID"?: string })[]) =>
      parseRoadmapTab([
        ID_HEADER,
        ...rows.map((cells) =>
          ID_HEADER.map(
            (column) => (cells as Record<string, string>)[column] ?? "",
          ),
        ),
      ])

    it("reads the ID by header, wherever the column is, trimmed", () => {
      const tab = parseUnder(
        [...HEADER.slice(0, 3), "  item id ", ...HEADER.slice(3)],
        { Title: "First", Horizon: "Now", "  item id ": "  k7q2xw " } as Cells,
      )
      expect(tab.items[0]?.id).toBe("k7q2xw")
      expect(tab.items[0]?.title.en).toBe("First")
      expect(tab.problems).toEqual([])
    })

    it("gives an item with no column, or a blank cell, no ID and records nothing", () => {
      expect(parseRows({ Title: "A", Horizon: "Now" }).items[0]?.id).toBeNull()
      const tab = withIds({ Title: "B", Horizon: "Now" })
      expect(tab.items[0]?.id).toBeNull()
      expect(tab.problems).toEqual([])
    })

    it("leaves a repeated ID with the first row", () => {
      const tab = withIds(
        { "Item ID": "k7q2xw", Title: "First", Horizon: "Now" },
        { "Item ID": "k7q2xw", Title: "Second", Horizon: "Now" },
      )
      expect(tab.items.map((item) => item.id)).toEqual(["k7q2xw", null])
      expect(tab.problems).toEqual([
        problem("duplicate-item-id", {
          row: 3,
          column: "Item ID",
          value: "k7q2xw",
        }),
      ])
    })

    it("treats a row with only an ID as having no title, and does not count its ID", () => {
      const tab = withIds(
        { "Item ID": "k7q2xw" },
        { "Item ID": "k7q2xw", Title: "Kept", Horizon: "Now" },
      )
      expect(tab.items.map((item) => item.id)).toEqual(["k7q2xw"])
      expect(tab.problems).toEqual([
        problem("missing-title", { row: 2, column: "Title", value: "" }),
      ])
    })

    it("returns the spreadsheet row of each kept item", () => {
      const tab = parseRows(
        { Title: "A", Horizon: "Now" },
        {},
        { Title: "B", Horizon: "Now" },
        { Title: "C", Horizon: "Now" },
      )
      expect(tab.rows).toEqual([2, 4, 5])
    })

    it("returns where each English column is, found by header", () => {
      const tab = parseUnder(["Outcome", "Title (cy)", " title ", "Item ID"], {
        " title ": "A",
      } as Cells)
      expect(tab.columns).toEqual(
        new Map([
          ["Title", 2],
          ["Item ID", 3],
          ["Outcome", 0],
        ]),
      )
    })
  })

  describe("skipped rows (S4)", () => {
    it("skips a blank row silently and a row with no English title with a problem", () => {
      const tab = parseRows(
        {},
        { Description: "No title", Horizon: "Now" },
        { "Title (cy)": "Teitl yn unig" },
        { Title: "Kept", Horizon: "Now" },
      )
      expect(tab.items.map((item) => item.title.en)).toEqual(["Kept"])
      expect(tab.problems).toEqual([
        problem("missing-title", { row: 3, column: "Title", value: "" }),
        problem("missing-title", { row: 4, column: "Title", value: "" }),
      ])
    })

    it("treats a row of spaces, or shorter than the header, as blank", () => {
      const tab = parseRoadmapTab([[...HEADER], ["  ", " "], []])
      expect(tab).toMatchObject({ items: [], rows: [], problems: [] })
    })
  })

  describe("tags, organisations and details (S5, S10)", () => {
    it("drops blank and repeated tags, ignoring Welsh whose count differs", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Labels: "Service X, , Service Y, Service X,",
        "Labels (cy)": "-, Gwasanaeth Y",
      })
      expect(tab.items[0]?.tags).toEqual([
        { en: "Service X", cy: "" },
        { en: "Service Y", cy: "" },
      ])
      expect(tab.problems).toEqual([
        problem("welsh-count-mismatch", {
          row: 2,
          column: "Labels (cy)",
          value: "-, Gwasanaeth Y",
        }),
      ])
    })

    it("pairs tags by position, a `-` or blank Welsh tag showing the English", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Labels: "A\nB, C",
        "Labels (cy)": "Y\n, -",
      })
      expect(tab.items[0]?.tags).toEqual([
        { en: "A", cy: "Y" },
        { en: "B", cy: "" },
        { en: "C", cy: "" },
      ])
      expect(tab.problems).toEqual([])
    })

    it("names known organisations by id in the built-in order, recording an unknown code and keeping it as written (S3)", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Organisations: "sbuhb, National, CAVUHB, Mars",
      })
      expect(tab.items[0]?.organisationIds).toEqual([
        "national",
        "cavuhb",
        "sbuhb",
      ])
      expect(tab.items[0]?.unknownOrganisationCodes).toEqual(["Mars"])
      expect(tab.problems).toEqual([
        problem("unknown-organisation", {
          row: 2,
          column: "Organisations",
          value: "Mars",
        }),
      ])
    })

    it("matches organisations like headers, line separated, without repeats", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Organisations: " heiw\nC.A.V.U.H.B,, cavuhb",
      })
      expect(tab.items[0]?.organisationIds).toEqual(["cavuhb", "heiw"])
      expect(tab.items[0]?.unknownOrganisationCodes).toEqual([])
      expect(tab.problems).toEqual([])
    })

    it("holds `c.a.v.u.h.b` as cavuhb and `CAVHB` as an unknown code, kept as written (S3)", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Organisations: "c.a.v.u.h.b, CAVHB",
      })
      expect(tab.items[0]?.organisationIds).toEqual(["cavuhb"])
      expect(tab.items[0]?.unknownOrganisationCodes).toEqual(["CAVHB"])
      expect(tab.problems).toEqual([
        problem("unknown-organisation", {
          row: 2,
          column: "Organisations",
          value: "CAVHB",
        }),
      ])
    })

    it("ignores Welsh details whose count differs", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Details: "One\n- Two",
        "Details (cy)": "Un",
      })
      expect(tab.items[0]?.details).toEqual([
        { level: 0, text: { en: "One", cy: "" } },
        { level: 1, text: { en: "Two", cy: "" } },
      ])
      expect(tab.problems).toEqual([
        problem("welsh-count-mismatch", {
          row: 2,
          column: "Details (cy)",
          value: "Un",
        }),
      ])
    })

    it("strips only the Welsh dashes that nest, so `-5 gradd` keeps its dash", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Details: "Below zero\n- Nested\n--Deeper\nTop",
        "Details (cy)": "-5 gradd\n- Nythu\n--Dyfnach\n-",
      })
      expect(tab.items[0]?.details).toEqual([
        { level: 0, text: { en: "Below zero", cy: "-5 gradd" } },
        { level: 1, text: { en: "Nested", cy: "Nythu" } },
        { level: 2, text: { en: "Deeper", cy: "Dyfnach" } },
        { level: 0, text: { en: "Top", cy: "" } },
      ])
    })

    it("keeps a blank middle entry's place while pairing, then drops it (S10)", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        Labels: "A,,B",
        "Labels (cy)": "Y,,Z",
        Details: "First\n\n- Third",
        "Details (cy)": "Cyntaf\n\n- Trydydd",
      })
      expect(tab.items[0]?.tags).toEqual([
        { en: "A", cy: "Y" },
        { en: "B", cy: "Z" },
      ])
      expect(tab.items[0]?.details).toEqual([
        { level: 0, text: { en: "First", cy: "Cyntaf" } },
        { level: 1, text: { en: "Third", cy: "Trydydd" } },
      ])
      expect(tab.problems).toEqual([])
    })
  })

  describe("optional text (S6)", () => {
    it("is null with no English, dropping and recording Welsh with no English", () => {
      const tab = parseUnder(
        headerWithout("Phase", "Phase (cy)", "Details", "Details (cy)"),
        {
          Title: "An item",
          Horizon: "Now",
          "Outcome (cy)": "Canlyniad",
        },
      )
      expect(tab.items[0]).toEqual(createTestRoadmapItem("An item"))
      expect(tab.problems).toEqual([
        problem("missing-column", { column: "Phase" }),
        problem("missing-column", { column: "Details" }),
        problem("welsh-without-english", {
          row: 2,
          column: "Outcome (cy)",
          value: "Canlyniad",
        }),
      ])
    })

    it("records each missing optional column once, however many rows", () => {
      const tab = parseRoadmapTab([
        ["Title", "Horizon"],
        ["One", "Now"],
        ["Two", "Next"],
      ])
      expect(tab.problems).toEqual(
        [
          "Description",
          "Outcome",
          "Phase",
          "Labels",
          "Organisations",
          "Details",
        ].map((column) => problem("missing-column", { column })),
      )
    })

    it("drops Welsh tags and details with no English", () => {
      const tab = parseRows({
        Title: "An item",
        Horizon: "Now",
        "Labels (cy)": "Tag",
        "Details (cy)": "Manylyn",
      })
      expect(tab.items[0]).toEqual(createTestRoadmapItem("An item"))
      expect(tab.problems.map(({ code, column }) => [code, column])).toEqual([
        ["welsh-without-english", "Labels (cy)"],
        ["welsh-without-english", "Details (cy)"],
      ])
    })

    it("trims a cell's surrounding spaces and keeps its inner line breaks", () => {
      const tab = parseRows({
        Title: "  An item \n",
        Horizon: " Now ",
        Description: "\n First line\nSecond line  ",
      })
      expect(tab.items[0]?.title.en).toBe("An item")
      expect(tab.items[0]?.description?.en).toBe("First line\nSecond line")
    })
  })

  describe("an unreadable tab (S7)", () => {
    it.each([
      ["no rows", []],
      [
        "no Title column",
        [
          ["Horizon", "Description"],
          ["Now", "Work"],
        ],
      ],
    ])("fails with invalid-data for %s", (_, rows) => {
      const error = parseFailure(rows)
      expect(isAppError(error) && error.kind).toBe("invalid-data")
    })

    it("gives no items and no failure for a header alone", () => {
      expect(parseRoadmapTab([[...HEADER]])).toMatchObject({
        items: [],
        rows: [],
        problems: [],
      })
    })
  })
})

describe("roadmapTabColumns (STY-035)", () => {
  it("names the columns the header has, matched as the parser matches them", () => {
    expect([
      ...roadmapTabColumns([["  title ", "HORIZON", "Title (cy)", "Other"]]),
    ]).toEqual(["Title", "Horizon"])
  })

  it("names none, without failing, for a tab with no Title column or no rows", () => {
    expect([...roadmapTabColumns([["Name", "Horizon"]])]).toEqual(["Horizon"])
    expect([...roadmapTabColumns([])]).toEqual([])
  })
})
