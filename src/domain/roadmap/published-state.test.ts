import { describe, expect, it } from "vitest"

import {
  findPublishedStateRow,
  heldPublishedState,
  planPublishedStateWrite,
  type FoundRow,
  type PublishedStateRow,
  type PublishProblem,
} from "./published-state"
import type { RoadmapSnapshot } from "./publish-plan"
import { NO_CHANGES } from "./roadmap-changes"
import { addingItems, NEW_CLINIC } from "./testing/test-new-item"
import { createTestRoadmap } from "./testing/test-roadmap"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const loaded = createTestRoadmap("producta", "Product A", {
  published: false,
  statusLabel: { en: "Beta", cy: "Beta" },
})
const row = (
  overrides: Partial<typeof loaded> = {},
  written: boolean | null = false,
): PublishedStateRow => ({ roadmap: { ...loaded, ...overrides }, written })

const item = createTestRoadmapItem("Work", { id: "k7q2xw", placement: null })
const snapshot: RoadmapSnapshot = {
  roadmap: loaded,
  items: [item],
  repeatedIds: new Set(),
  takenIds: new Set(["k7q2xw"]),
  missingLists: new Set(),
  organisationIds: new Set(),
}
const found: FoundRow = {
  kind: "found",
  index: 0,
  writeState: true,
  check: true,
  taken: [],
}

describe("findPublishedStateRow", () => {
  it("finds the first row holding what was loaded, whatever its state", () => {
    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ title: { en: "Other", cy: "" } }),
        row({}, null),
      ]),
    ).toEqual({ ...found, index: 1 })
  })

  it("leaves an edited field out whole, its Welsh and its being blank too", () => {
    const changes = {
      ...NO_CHANGES,
      roadmap: {
        statusLabel: { base: "Beta", value: "Live" },
        vision: { base: "", value: "Clear" },
      },
    }
    const edited = { published: true, changes } as const

    expect(
      findPublishedStateRow(loaded, edited, [
        row({
          statusLabel: { en: "Alpha", cy: "Alffa" },
          vision: { en: "Clear", cy: "" },
        }),
      ]).kind,
    ).toBe("found")
    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ statusLabel: { en: "Beta", cy: "Alffa" } }),
      ]),
    ).toMatchObject({ kind: "settled", outcome: { status: "changed" } })
  })

  it("leaves Last updated out when it is set, so a co-lead's date is no change (STY-036)", () => {
    const today = {
      published: true,
      changes: {
        ...NO_CHANGES,
        roadmap: {
          lastUpdated: { base: "", value: "2026-11-13", overwrite: true },
        },
      },
    } as const

    expect(
      findPublishedStateRow(loaded, today, [
        row({ lastUpdated: "2026-11-01" }),
      ]),
    ).toEqual(found)
    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ lastUpdated: "2026-11-01" }),
      ]),
    ).toMatchObject({ kind: "settled", outcome: { status: "changed" } })
  })

  it("still writes a date set on publishing a roadmap a co-lead already published (STY-036 D10)", () => {
    const today = {
      published: true,
      changes: {
        ...NO_CHANGES,
        roadmap: {
          lastUpdated: { base: "", value: "2026-11-13", overwrite: true },
        },
      },
    } as const

    expect(findPublishedStateRow(loaded, today, [row({}, true)])).toEqual({
      ...found,
      writeState: false,
      check: false,
    })
  })

  it("never takes a row naming another place for its items, though its id is the same", () => {
    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ itemsLocation: "Product-A" }),
      ]),
    ).toMatchObject({ kind: "settled", outcome: { status: "changed" } })
  })

  it("takes, of rows alike, the one the list kept: the first published for a published roadmap", () => {
    const live = { ...loaded, published: true }

    expect(
      findPublishedStateRow(live, { published: false }, [
        row({}, false),
        row({ published: true }, true),
      ]),
    ).toEqual({ ...found, index: 1, check: false })
  })

  it("takes, of rows alike, the first for a roadmap not published, though a co-lead published it (D9)", () => {
    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ published: true }, true),
        row({}, false),
      ]),
    ).toEqual({ kind: "settled", outcome: { status: "set" } })
  })

  it("gives the roadmap the list keeps when no row holds what was loaded", () => {
    const live = row({ title: { en: "Live", cy: "" }, published: true }, true)

    expect(
      findPublishedStateRow(loaded, { published: true }, [
        row({ title: { en: "Draft", cy: "" } }),
        live,
      ]),
    ).toEqual({
      kind: "settled",
      outcome: { status: "changed", roadmap: live.roadmap },
    })
  })

  it("never checks an unpublish, or names a published twin then (D2)", () => {
    expect(
      findPublishedStateRow(
        { ...loaded, published: true },
        { published: false },
        [
          row({ published: true }, true),
          row({ title: { en: "Twin", cy: "" }, published: true }, true),
        ],
      ),
    ).toEqual({ ...found, check: false })
  })
})

describe("a new item sent with a roadmap's published state (STY-045)", () => {
  const changes = addingItems(NEW_CLINIC)

  it("is a pending edit to write, though the roadmap already reads as published", () => {
    expect(
      findPublishedStateRow(loaded, { published: true, changes }, [
        row({}, true),
      ]),
    ).toEqual({ ...found, writeState: false, check: false })
    expect(
      findPublishedStateRow(loaded, { published: true }, [row({}, true)]),
    ).toEqual({ kind: "settled", outcome: { status: "set" } })
  })
})

describe("a placement's order sent with a roadmap's published state (STY-050)", () => {
  const changes = {
    ...NO_CHANGES,
    orders: [
      {
        placement: "now" as const,
        base: [{ id: "firstidx" }, { id: "secondid" }],
        items: [{ id: "secondid" }, { id: "firstidx" }],
      },
    ],
  }

  it("is a pending edit to write, though the roadmap already reads as published", () => {
    expect(
      findPublishedStateRow(loaded, { published: true, changes }, [
        row({}, true),
      ]),
    ).toEqual({ ...found, writeState: false, check: false })
  })
})

describe("planPublishedStateWrite", () => {
  const horizon: PublishProblem = {
    code: "items-field-missing",
    location: "ProductA",
    field: "placement",
  }

  it("refuses at once, reading no items, when the items can't be read", () => {
    const missing: PublishProblem = {
      code: "items-missing",
      location: "ProductA",
    }

    expect(
      planPublishedStateWrite(found, { published: true }, [missing], null),
    ).toEqual({
      kind: "settled",
      outcome: { status: "unpublishable", problems: [missing] },
    })
  })

  it("publishes a tab without a Horizon column once a placement written adds one", () => {
    const changes = {
      ...NO_CHANGES,
      items: [
        {
          item,
          position: 0,
          fields: { placement: { base: "", value: "now" } },
        },
      ],
    }

    expect(
      planPublishedStateWrite(
        found,
        { published: true, changes },
        [horizon],
        snapshot,
      ),
    ).toMatchObject({ kind: "write", writeState: true })
    expect(
      planPublishedStateWrite(found, { published: true }, [horizon], null),
    ).toMatchObject({ outcome: { status: "unpublishable" } })
  })

  it("publishes a tab without a Horizon column once a new item, always placed, adds one (STY-045)", () => {
    const changes = addingItems(NEW_CLINIC)

    expect(
      planPublishedStateWrite(
        found,
        { published: true, changes },
        [horizon],
        snapshot,
      ),
    ).toMatchObject({
      kind: "write",
      writeState: true,
      writes: { newItems: [{ id: "ckn7q2xw" }] },
    })
  })

  it("ignores problems when the state is not checked", () => {
    expect(
      planPublishedStateWrite(
        { ...found, check: false },
        { published: false },
        [horizon],
        null,
      ),
    ).toEqual({ kind: "write", writeState: true, writes: null })
  })
})

describe("heldPublishedState", () => {
  const write = { kind: "write", writeState: true, writes: null } as const

  it("is all, none or some by the state as now written", () => {
    const change = { published: true } as const

    expect(heldPublishedState(change, write, row({}, true), null)).toBe("all")
    expect(heldPublishedState(change, write, row({}, false), null)).toBe("none")
    expect(heldPublishedState(change, write, undefined, null)).toBe("some")
  })

  it("counts a date set as one of the edits (STY-036)", () => {
    const writes = {
      roadmap: [{ field: "lastUpdated" as const, value: "2026-11-13" }],
      items: [],
      ids: [],
      removals: [],
      moves: [],
      orders: [],
      newItems: [],
    }
    const held = (lastUpdated: string) =>
      heldPublishedState(
        { published: true },
        { ...write, writes },
        row({ lastUpdated }, true),
        { ...snapshot, roadmap: { ...loaded, lastUpdated } },
      )

    expect(held("2026-11-13")).toBe("all")
    expect(held("2026-11-01")).toBe("some")
  })

  it("is some when the state is held but the edits are not", () => {
    const writes = {
      roadmap: [{ field: "statusLabel" as const, value: "Live" }],
      items: [],
      ids: [],
      removals: [],
      moves: [],
      orders: [],
      newItems: [],
    }

    expect(
      heldPublishedState(
        { published: true },
        { ...write, writes },
        row({}, true),
        snapshot,
      ),
    ).toBe("some")
  })
})
