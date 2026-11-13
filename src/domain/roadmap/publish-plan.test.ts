import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "./publish-plan"
import { UNLISTED_FAMILY } from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import { createTestRoadmap } from "./testing/test-roadmap"
import { createTestRoadmapItem } from "./testing/test-roadmap-item"

const roadmap = createTestRoadmap("producta", "Product A")

function snapshotOf(
  items: RoadmapItem[],
  takenIds: string[] = [],
): RoadmapSnapshot {
  return {
    roadmap,
    items,
    repeatedIds: new Set(),
    takenIds: new Set([...takenIds, ...items.flatMap(({ id }) => id ?? [])]),
    missingLists: new Set(),
  }
}

/** IDs handed out in turn. */
function idsOf(...ids: string[]) {
  return () => ids.shift() ?? "exhausted"
}

describe("planRoadmapPublish", () => {
  it("gives new IDs only to items without one, skipping any the roadmap holds", () => {
    const items = [
      createTestRoadmapItem("Kept", { id: "keptidxx" }),
      createTestRoadmapItem("First"),
      createTestRoadmapItem("Second"),
    ]

    const plan = planRoadmapPublish(
      {
        roadmap: { vision: { base: "", value: "A vision" } },
        items: [],
      },
      snapshotOf(items, ["dropidxx"]),
      idsOf("keptidxx", "newidaaa", "dropidxx", "newidaaa", "newidbbb"),
    )

    expect(plan).toEqual({
      kind: "write",
      writes: {
        roadmap: [{ field: "vision", value: "A vision" }],
        items: [],
        ids: [
          { index: 1, id: "newidaaa" },
          { index: 2, id: "newidbbb" },
        ],
      },
    })
  })

  it("writes nothing, not even IDs, when every change is already held", () => {
    const item = createTestRoadmapItem("Item", {
      phase: { en: "Live", cy: "" },
    })

    const plan = planRoadmapPublish(
      {
        roadmap: { title: { base: "Product A", value: " Product A " } },
        items: [
          {
            item,
            position: 0,
            fields: { phase: { base: "Beta", value: "Live" } },
          },
        ],
      },
      snapshotOf([item]),
      idsOf(),
    )

    expect(plan).toEqual({ kind: "settled", outcome: { status: "published" } })
  })

  it.each([
    ["at its position", null, new Set<string>()],
    ["by a copied ID", "copiedid", new Set(["copiedid"])],
  ])(
    "finds no item %s whose Welsh differs, though its English is the pending edit",
    (_, id, repeatedIds) => {
      const loaded = {
        ...createTestRoadmapItem("A", { id }),
        title: { en: "A", cy: "Cyntaf" },
      }
      const other = {
        ...createTestRoadmapItem("B", { id }),
        title: { en: "B", cy: "Arall" },
      }
      const changes = {
        item: loaded,
        position: 0,
        fields: { title: { base: "A", value: "B" } },
      }

      const plan = planRoadmapPublish(
        { roadmap: {}, items: [changes] },
        { ...snapshotOf([other]), repeatedIds },
        idsOf(),
      )

      expect(plan).toEqual({
        kind: "settled",
        outcome: { status: "refused", conflicts: [], missingItems: [changes] },
      })
    },
  )

  it.each([
    [
      "clears English whose Welsh the read then leaves out",
      "Before",
      "Cyn",
      "",
    ],
    ["adds English to Welsh the loaded read left out", "", "", "After"],
  ])(
    "finds an item at its position that %s",
    (_, loadedEnglish, loadedWelsh, value) => {
      const description = (en: string, cy: string) =>
        en === "" ? null : { en, cy }
      const loaded = createTestRoadmapItem("A", {
        description: description(loadedEnglish, loadedWelsh),
      })
      // As the tab reads once written: the Welsh cell is never touched.
      const written = createTestRoadmapItem("A", {
        description: description(value, "Cyn"),
      })

      const plan = planRoadmapPublish(
        {
          roadmap: {},
          items: [
            {
              item: loaded,
              position: 0,
              fields: { description: { base: loadedEnglish, value } },
            },
          ],
        },
        snapshotOf([written]),
        idsOf("newidaaa"),
      )

      expect(plan).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
    },
  )

  describe("a family or category, decided by its ID (STY-028 S5)", () => {
    const inFamily = (familyId: string, name: string) => ({
      ...snapshotOf([]),
      roadmap: createTestRoadmap("producta", "Product A", {
        familyId,
        family: { en: name, cy: "" },
        categoryId: "khzpchkh",
        category: { en: "GP & Community Services", cy: "" },
      }),
    })
    const moveToMedicines = {
      roadmap: {
        familyId: { base: "fc29g5b9", value: "vdkxj63m" },
        categoryId: { base: "khzpchkh", value: "" },
      },
      items: [],
    }

    it("writes the chosen IDs over a family renamed since", () => {
      const plan = planRoadmapPublish(
        moveToMedicines,
        inFamily("fc29g5b9", "Single Record (renamed)"),
      )

      expect(plan).toEqual({
        kind: "write",
        writes: {
          roadmap: [
            { field: "familyId", value: "vdkxj63m" },
            { field: "categoryId", value: "" },
          ],
          items: [],
          ids: [],
        },
      })
    })

    it("refuses over a family a co-lead chose since", () => {
      const plan = planRoadmapPublish(
        moveToMedicines,
        inFamily("x7k2m9qp", "Workforce"),
      )

      expect(plan).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "roadmap",
              field: "familyId",
              base: "fc29g5b9",
              pending: "vdkxj63m",
              current: "x7k2m9qp",
            },
          ],
          missingItems: [],
        },
      })
    })

    it("writes No family over a family the list doesn't have", () => {
      const snapshot = {
        ...snapshotOf([]),
        roadmap: createTestRoadmap("productd", "Product D", {
          family: { en: "Single Recrod", cy: "" },
          familyNotListed: true,
        }),
      }

      const plan = planRoadmapPublish(
        {
          roadmap: { familyId: { base: UNLISTED_FAMILY, value: "" } },
          items: [],
        },
        snapshot,
      )

      expect(plan).toMatchObject({
        kind: "write",
        writes: { roadmap: [{ field: "familyId", value: "" }] },
      })
    })
  })

  it.each(["familyId", "categoryId"] as const)(
    "rejects a %s chosen while its list is missing, even No family or category",
    (field) => {
      const snapshot = { ...snapshotOf([]), missingLists: new Set([field]) }

      expect(() =>
        planRoadmapPublish(
          { roadmap: { [field]: { base: "fc29g5b9", value: "" } }, items: [] },
          snapshot,
        ),
      ).toThrow(expect.objectContaining({ kind: "invalid-data" }))
    },
  )

  describe("a placement, decided by its id (STY-031)", () => {
    const later = createTestRoadmapItem("Online booking", {
      id: "bookingx",
      placement: "later",
    })
    const unplaced = createTestRoadmapItem("Unplaced", {
      id: "unplaced",
      placement: null,
      writtenHorizon: "Soon",
    })
    const move = (item: RoadmapItem, base: string, value: string) => ({
      roadmap: {},
      items: [{ item, position: 0, fields: { placement: { base, value } } }],
    })

    it("writes the item's new placement as its id", () => {
      expect(
        planRoadmapPublish(move(later, "later", "now"), snapshotOf([later])),
      ).toEqual({
        kind: "write",
        writes: {
          roadmap: [],
          items: [
            { index: 0, id: "bookingx", field: "placement", value: "now" },
          ],
          ids: [],
        },
      })
    })

    it("places an unplaced item, whose base is none, whatever its horizon now says", () => {
      const respelt = { ...unplaced, writtenHorizon: "Sooner" }

      const plan = planRoadmapPublish(
        move(unplaced, "", "later"),
        snapshotOf([respelt]),
      )

      expect(plan.kind === "write" && plan.writes.items).toEqual([
        { index: 0, id: "unplaced", field: "placement", value: "later" },
      ])
    })

    it("is a conflict when a co-lead moved it elsewhere, and none when to the same place", () => {
      const intent = move(later, "later", "now")
      const elsewhere = planRoadmapPublish(
        intent,
        snapshotOf([{ ...later, placement: "next" }]),
      )
      const same = planRoadmapPublish(
        intent,
        snapshotOf([{ ...later, placement: "now" }]),
      )

      expect(elsewhere).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "placement",
              base: "later",
              pending: "now",
              current: "next",
            },
          ],
          missingItems: [],
        },
      })
      expect(same).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
    })

    it.each(["", "  ", "soon"])(
      "rejects the placement %j, which the editor never sends",
      (value) => {
        expect(() =>
          planRoadmapPublish(move(later, "later", value), snapshotOf([later])),
        ).toThrow(expect.objectContaining({ kind: "unknown" }))
      },
    )
  })

  it("rejects a blank title, which the editor never sends", () => {
    let error: unknown
    try {
      planRoadmapPublish(
        { roadmap: { title: { base: "Product A", value: "  " } }, items: [] },
        snapshotOf([]),
      )
    } catch (caught) {
      error = caught
    }

    expect(isAppError(error) && error.kind).toBe("unknown")
  })
})

describe("heldWrites", () => {
  const writes: PublishWrites = {
    roadmap: [{ field: "vision", value: "A vision" }],
    items: [{ index: 0, id: "newidaaa", field: "phase", value: "Live" }],
    ids: [{ index: 0, id: "newidaaa" }],
  }
  const before = createTestRoadmapItem("Item")
  const after = createTestRoadmapItem("Item", {
    id: "newidaaa",
    phase: { en: "Live", cy: "" },
  })
  const written = { ...roadmap, vision: { en: "A vision", cy: "" } }

  it("tells whether all, none or some of the writes are held", () => {
    expect(
      heldWrites(writes, { ...snapshotOf([after]), roadmap: written }),
    ).toBe("all")
    expect(heldWrites(writes, snapshotOf([before]))).toBe("none")
    expect(
      heldWrites(writes, { ...snapshotOf([before]), roadmap: written }),
    ).toBe("some")
  })

  it("finds each written item by its ID, wherever its row has moved", () => {
    const inserted = createTestRoadmapItem("Added by a co-lead")

    expect(
      heldWrites(writes, {
        ...snapshotOf([inserted, after]),
        roadmap: written,
      }),
    ).toBe("all")
  })

  it("holds nothing for an item that has gone, even if another item now has its place", () => {
    const itemWrites: PublishWrites = {
      roadmap: [],
      items: [{ index: 0, id: "newidaaa", field: "phase", value: "Live" }],
      ids: [{ index: 0, id: "newidaaa" }],
    }
    const alreadyLive = createTestRoadmapItem("Other", {
      phase: { en: "Live", cy: "" },
    })

    expect(heldWrites(itemWrites, snapshotOf([alreadyLive]))).toBe("none")
  })

  it("can't tell when a written item's row is still there but no longer read", () => {
    expect(heldWrites(writes, snapshotOf([], ["newidaaa"]))).toBe("some")
  })

  it("can't tell when the roadmap is no longer listed", () => {
    expect(heldWrites(writes, null)).toBe("some")
  })
})
