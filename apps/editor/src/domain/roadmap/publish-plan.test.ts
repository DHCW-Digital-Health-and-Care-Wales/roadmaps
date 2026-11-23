import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "./publish-plan"
import { orderedItem } from "./placement-order"
import {
  type ItemChanges,
  type NewItem,
  NO_CHANGES,
  type OrderedItem,
  type PlacementOrder,
  type RoadmapChanges,
  UNLISTED_FAMILY,
} from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
import type { RoadmapPlacement } from "./roadmap-placement"
import { addingItems, NEW_CLINIC, NEW_LETTERS } from "./testing/test-new-item"
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
    organisationIds: new Set(["national", "cavuhb", "sbuhb", "pthb"]),
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
      { ...NO_CHANGES, roadmap: { vision: { base: "", value: "A vision" } } },
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
        removals: [],
        moves: [],
        orders: [],
        newItems: [],
      },
    })
  })

  it("writes nothing, not even IDs, when every change is already held", () => {
    const item = createTestRoadmapItem("Item", {
      phase: { en: "Live", cy: "" },
    })

    const plan = planRoadmapPublish(
      {
        ...NO_CHANGES,
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
        { ...NO_CHANGES, items: [changes] },
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
          ...NO_CHANGES,
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
      ...NO_CHANGES,
      roadmap: {
        familyId: { base: "fc29g5b9", value: "vdkxj63m" },
        categoryId: { base: "khzpchkh", value: "" },
      },
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
          removals: [],
          moves: [],
          orders: [],
          newItems: [],
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
          ...NO_CHANGES,
          roadmap: { familyId: { base: UNLISTED_FAMILY, value: "" } },
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
          {
            ...NO_CHANGES,
            roadmap: { [field]: { base: "fc29g5b9", value: "" } },
          },
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
      ...NO_CHANGES,
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
          removals: [],
          moves: [],
          orders: [],
          newItems: [],
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

    describe("moving its row, last in its new placement (STY-051)", () => {
      const a = createTestRoadmapItem("A", { id: "aaaaaaaa" })
      const b = createTestRoadmapItem("B", { id: "bbbbbbbb" })
      const toNow = (item: RoadmapItem, position: number) => ({
        item,
        position,
        fields: { placement: { base: "later", value: "now" } },
      })
      const video = createTestRoadmapItem("Video", {
        id: "videoxxx",
        placement: "later",
      })

      it("moves the row to just after the placement's last item as re-read, a co-lead's included (S3, S4)", () => {
        const plan = planRoadmapPublish(
          { ...NO_CHANGES, items: [toNow(later, 0)] },
          snapshotOf([later, a, b]),
        )

        expect(plan.kind === "write" && plan.writes).toEqual({
          roadmap: [],
          items: [
            { index: 0, id: "bookingx", field: "placement", value: "now" },
          ],
          ids: [],
          removals: [],
          moves: [{ index: 0, after: 2 }],
          orders: [],
          newItems: [],
        })
      })

      it("moves several in the order they were moved, whatever their rows' order (S6)", () => {
        const plan = planRoadmapPublish(
          { ...NO_CHANGES, items: [toNow(video, 1), toNow(later, 0)] },
          snapshotOf([later, video, a]),
        )

        expect(plan.kind === "write" && plan.writes.moves).toEqual([
          { index: 1, after: 2 },
          { index: 0, after: 1 },
        ])
      })

      it("moves no row for a placement the roadmap already holds, whoever wrote it", () => {
        const plan = planRoadmapPublish(
          {
            ...NO_CHANGES,
            roadmap: { vision: { base: "", value: "A vision" } },
            items: [toNow(later, 0)],
          },
          snapshotOf([{ ...later, placement: "now" }, a, b]),
        )

        expect(plan.kind === "write" && plan.writes).toMatchObject({
          items: [],
          removals: [],
          moves: [],
          orders: [],
        })
      })

      it("moves no row for an edit that is no move", () => {
        const plan = planRoadmapPublish(
          {
            ...NO_CHANGES,
            items: [
              {
                item: later,
                position: 0,
                fields: { phase: { base: "", value: "Beta" } },
              },
            ],
          },
          snapshotOf([later, a, video]),
        )

        expect(plan.kind === "write" && plan.writes.moves).toEqual([])
      })

      it("moves nothing when a co-lead's change refuses the publish", () => {
        const plan = planRoadmapPublish(
          { ...NO_CHANGES, items: [toNow(later, 0)] },
          snapshotOf([{ ...later, placement: "next" }, a]),
        )

        expect(plan).toMatchObject({
          kind: "settled",
          outcome: { status: "refused" },
        })
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

  describe("organisations, decided as a set of ids (STY-034)", () => {
    const item = createTestRoadmapItem("Online booking", {
      id: "bookingx",
      organisationIds: ["cavuhb"],
    })
    const choose = (base: string, value: string) => ({
      ...NO_CHANGES,
      items: [
        { item, position: 0, fields: { organisationIds: { base, value } } },
      ],
    })

    it("writes the chosen set as sorted ids, or none", () => {
      const chosen = planRoadmapPublish(
        choose("cavuhb", "sbuhb,national"),
        snapshotOf([item]),
      )
      const none = planRoadmapPublish(choose("cavuhb", ""), snapshotOf([item]))

      expect(chosen.kind === "write" && chosen.writes.items).toEqual([
        {
          index: 0,
          id: "bookingx",
          field: "organisationIds",
          value: "national,sbuhb",
        },
      ])
      expect(none.kind === "write" && none.writes.items).toEqual([
        { index: 0, id: "bookingx", field: "organisationIds", value: "" },
      ])
    })

    it("is a conflict when a co-lead chose another set, and none when the same set in another order (S7)", () => {
      const intent = choose("cavuhb", "cavuhb,sbuhb")
      const other = planRoadmapPublish(
        intent,
        snapshotOf([{ ...item, organisationIds: ["pthb"] }]),
      )
      const same = planRoadmapPublish(
        intent,
        snapshotOf([{ ...item, organisationIds: ["sbuhb", "cavuhb"] }]),
      )

      expect(other).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "organisationIds",
              base: "cavuhb",
              pending: "cavuhb,sbuhb",
              current: "pthb",
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

    it("is no change when the pending set is the set as loaded, in another order", () => {
      expect(
        planRoadmapPublish(choose("cavuhb", " cavuhb "), snapshotOf([item])),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
      expect(
        planRoadmapPublish(
          choose("cavuhb,sbuhb", "sbuhb,cavuhb"),
          snapshotOf([{ ...item, organisationIds: ["sbuhb", "cavuhb"] }]),
        ),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
    })

    it("rejects an organisation the list doesn't hold, which the editor never sends", () => {
      expect(() =>
        planRoadmapPublish(
          choose("cavuhb", "cavuhb,cavhb"),
          snapshotOf([item]),
        ),
      ).toThrow(expect.objectContaining({ kind: "unknown" }))
    })
  })

  describe("tags, decided as the ordered list (STY-037)", () => {
    const tagged = (...tags: string[]) => tags.map((en) => ({ en, cy: "" }))
    const item = createTestRoadmapItem("Online booking", {
      id: "bookingx",
      tags: tagged("Patients", "Video consultations"),
    })
    const retag = (base: string, value: string) => ({
      ...NO_CHANGES,
      items: [{ item, position: 0, fields: { tags: { base, value } } }],
    })
    const BASE = "Patients, Video consultations"

    it("writes the tags in order, each trimmed, or none (S12)", () => {
      const changed = planRoadmapPublish(
        retag(BASE, " Patients,Video appointments , Carers "),
        snapshotOf([item]),
      )
      const none = planRoadmapPublish(retag(BASE, ""), snapshotOf([item]))

      expect(changed.kind === "write" && changed.writes.items).toEqual([
        {
          index: 0,
          id: "bookingx",
          field: "tags",
          value: "Patients, Video appointments, Carers",
        },
      ])
      expect(none.kind === "write" && none.writes.items).toEqual([
        { index: 0, id: "bookingx", field: "tags", value: "" },
      ])
    })

    it("is a conflict when a co-lead changed the tags or their order, and none for the same tags in the same order (S13)", () => {
      const intent = retag(BASE, "Patients, Carers")
      const reordered = planRoadmapPublish(
        intent,
        snapshotOf([
          { ...item, tags: tagged("Video consultations", "Patients") },
        ]),
      )
      const same = planRoadmapPublish(
        intent,
        snapshotOf([{ ...item, tags: tagged("Patients", "Carers") }]),
      )

      expect(reordered).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "tags",
              base: BASE,
              pending: "Patients, Carers",
              current: "Video consultations, Patients",
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

    it("refuses, as a conflict that can't be kept, when the item's tags have gained Welsh, even with the English as it was (S22)", () => {
      const intent = retag(BASE, "Patients, Carers")

      const plan = planRoadmapPublish(
        intent,
        snapshotOf([{ ...item, hasWelshTags: true }]),
      )

      expect(plan).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "tags",
              base: BASE,
              pending: "Patients, Carers",
              current: BASE,
              gainedWelsh: true,
            },
          ],
          missingItems: [],
        },
      })
    })

    it("writes the item's other fields beside Welsh tags, and takes tags already held as published (S20, S22)", () => {
      const withWelsh = { ...item, hasWelshTags: true }
      const other = planRoadmapPublish(
        {
          ...NO_CHANGES,
          items: [
            {
              item: withWelsh,
              position: 0,
              fields: { phase: { base: "", value: "Beta" } },
            },
          ],
        },
        snapshotOf([withWelsh]),
      )
      const held = planRoadmapPublish(
        retag(BASE, "Patients, Carers"),
        snapshotOf([{ ...withWelsh, tags: tagged("Patients", "Carers") }]),
      )

      expect(other.kind === "write" && other.writes.items).toEqual([
        { index: 0, id: "bookingx", field: "phase", value: "Beta" },
      ])
      expect(held).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
    })
  })

  describe("details, decided as the list they show as (STY-039)", () => {
    const detailed = (...lines: [string, number][]) =>
      lines.map(([en, level]) => ({ text: { en, cy: "" }, level }))
    const item = createTestRoadmapItem("Video appointments", {
      id: "videoxxx",
      details: detailed(["Follow-up appointments", 0], ["Dermatology", 1]),
    })
    const BASE = "Follow-up appointments\n- Dermatology"
    const MINE = "Follow-up appointments\n- Dermatology\n-- Adult clinics first"
    const redetail = (base: string, value: string) => ({
      ...NO_CHANGES,
      items: [{ item, position: 0, fields: { details: { base, value } } }],
    })

    it("writes the details as lines, a hyphen for each level shown and a space, or none (S14)", () => {
      const changed = planRoadmapPublish(
        redetail(
          BASE,
          "- Follow-up  appointments \n--- Dermatology\n\nIn person",
        ),
        snapshotOf([item]),
      )
      const none = planRoadmapPublish(redetail(BASE, ""), snapshotOf([item]))

      expect(changed.kind === "write" && changed.writes.items).toEqual([
        {
          index: 0,
          id: "videoxxx",
          field: "details",
          value: "Follow-up appointments\n- Dermatology\nIn person",
        },
      ])
      expect(none.kind === "write" && none.writes.items).toEqual([
        { index: 0, id: "videoxxx", field: "details", value: "" },
      ])
    })

    it("is a conflict when a co-lead changed the list, and none for details that show as the same list (S15, D4)", () => {
      const intent = redetail(BASE, MINE)
      const theirs = planRoadmapPublish(
        intent,
        snapshotOf([
          {
            ...item,
            details: detailed(
              ["Follow-up appointments", 0],
              ["Rheumatology", 1],
            ),
          },
        ]),
      )
      // The same list, every line written a hyphen deeper.
      const same = planRoadmapPublish(
        intent,
        snapshotOf([
          {
            ...item,
            details: detailed(
              ["Follow-up appointments", 1],
              ["Dermatology", 2],
              ["Adult clinics first", 3],
            ),
          },
        ]),
      )
      // The base list, its hyphens rewritten: the pending details are still written.
      const rewritten = planRoadmapPublish(
        intent,
        snapshotOf([
          {
            ...item,
            details: detailed(
              ["Follow-up appointments", 0],
              ["Dermatology", 3],
            ),
          },
        ]),
      )

      expect(theirs).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "details",
              base: BASE,
              pending: MINE,
              current: "Follow-up appointments\n- Rheumatology",
            },
          ],
          missingItems: [],
        },
      })
      expect(same).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
      expect(rewritten.kind === "write" && rewritten.writes.items).toEqual([
        { index: 0, id: "videoxxx", field: "details", value: MINE },
      ])
    })

    it("refuses, as a conflict that can't be kept, when the item's details have gained Welsh, even with the English as it was (S19)", () => {
      const intent = redetail(BASE, MINE)

      const plan = planRoadmapPublish(
        intent,
        snapshotOf([{ ...item, hasWelshDetails: true }]),
      )

      expect(plan).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "item",
              item: intent.items[0],
              field: "details",
              base: BASE,
              pending: MINE,
              current: BASE,
              gainedWelsh: true,
            },
          ],
          missingItems: [],
        },
      })
    })

    it("writes the item's other fields beside Welsh details, and takes details already held as published (S18, S19)", () => {
      const withWelsh = { ...item, hasWelshDetails: true }
      const other = planRoadmapPublish(
        {
          ...NO_CHANGES,
          items: [
            {
              item: withWelsh,
              position: 0,
              fields: { phase: { base: "", value: "Beta" } },
            },
          ],
        },
        snapshotOf([withWelsh]),
      )
      const held = planRoadmapPublish(
        redetail(BASE, "Follow-up appointments"),
        snapshotOf([
          { ...withWelsh, details: detailed(["Follow-up appointments", 0]) },
        ]),
      )

      expect(other.kind === "write" && other.writes.items).toEqual([
        { index: 0, id: "videoxxx", field: "phase", value: "Beta" },
      ])
      expect(held).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
    })
  })

  describe("Last updated, a calendar date (STY-036)", () => {
    const dated = { ...roadmap, lastUpdated: "2026-10-02" }
    const date = (base: string, value: string, overwrite?: true) => ({
      ...NO_CHANGES,
      roadmap: {
        lastUpdated: { base, value, ...(overwrite && { overwrite }) },
      },
    })
    const plan = (changes: ReturnType<typeof date>, current = dated) =>
      planRoadmapPublish(changes, { ...snapshotOf([]), roadmap: current })

    it.each([
      ["sets", "2026-11-10"],
      ["clears", ""],
    ])("%s the date, as YYYY-MM-DD text (S2, S5, S8)", (_case, value) => {
      expect(plan(date("2026-10-02", value))).toEqual({
        kind: "write",
        writes: {
          roadmap: [{ field: "lastUpdated", value }],
          items: [],
          ids: [],
          removals: [],
          moves: [],
          orders: [],
          newItems: [],
        },
      })
    })

    it("refuses a date a co-lead changed since it was edited (S9)", () => {
      expect(
        plan(date("2026-10-02", "2026-11-10"), {
          ...roadmap,
          lastUpdated: "2026-11-01",
        }),
      ).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            {
              subject: "roadmap",
              field: "lastUpdated",
              base: "2026-10-02",
              pending: "2026-11-10",
              current: "2026-11-01",
            },
          ],
          missingItems: [],
        },
      })
    })

    it("writes a date set over whatever it holds as never a conflict, as the tick box sets it (S6, S9)", () => {
      expect(
        plan(date("", "2026-11-13", true), {
          ...roadmap,
          lastUpdated: "2026-11-01",
        }),
      ).toEqual({
        kind: "write",
        writes: {
          roadmap: [{ field: "lastUpdated", value: "2026-11-13" }],
          items: [],
          ids: [],
          removals: [],
          moves: [],
          orders: [],
          newItems: [],
        },
      })
    })

    it("writes a date set over whatever it holds even when it was edited from it", () => {
      expect(
        plan(date("2026-11-13", "2026-11-13", true), {
          ...roadmap,
          lastUpdated: "2026-11-01",
        }),
      ).toMatchObject({ kind: "write" })
    })

    it("writes nothing when the date is already held", () => {
      expect(plan(date("", "2026-10-02", true))).toEqual({
        kind: "settled",
        outcome: { status: "published" },
      })
    })

    it.each(["13/11/2026", "2026-02-30", "2026-1-5", "today"])(
      "rejects %s, which is no YYYY-MM-DD date and the editor never sends",
      (value) => {
        expect(() => plan(date("2026-10-02", value))).toThrow(
          expect.objectContaining({ kind: "unknown" }),
        )
      },
    )
  })

  it("rejects a blank title, which the editor never sends", () => {
    let error: unknown
    try {
      planRoadmapPublish(
        {
          ...NO_CHANGES,
          roadmap: { title: { base: "Product A", value: "  " } },
        },
        snapshotOf([]),
      )
    } catch (caught) {
      error = caught
    }

    expect(isAppError(error) && error.kind).toBe("unknown")
  })

  describe("new items, written after the roadmap's last (STY-045)", () => {
    /** The letters item typed more loosely still: tags and details a publish tidies. */
    const untidy: NewItem = {
      ...NEW_LETTERS,
      values: {
        ...NEW_LETTERS.values,
        tags: " Patients ,, Carers,Patients",
        details: "Appointment letters\n- Outpatients\n--- Adult clinics first",
      },
    }
    const held = createTestRoadmapItem("Online booking", { id: "bookingx" })

    it("writes a new item's ID, title and placement, and no field it lacks (S2)", () => {
      expect(
        planRoadmapPublish(
          addingItems(NEW_CLINIC),
          snapshotOf([held]),
          idsOf(),
        ),
      ).toEqual({
        kind: "write",
        writes: {
          roadmap: [],
          items: [],
          ids: [],
          removals: [],
          moves: [],
          orders: [],
          newItems: [
            {
              id: "ckn7q2xw",
              fields: [
                { field: "title", value: "Choose a clinic closer to home" },
                { field: "placement", value: "next" },
              ],
            },
          ],
        },
      })
    })

    it("writes each field it has as that field's edit is written, in the order added (S2)", () => {
      const plan = planRoadmapPublish(
        addingItems(untidy, NEW_CLINIC),
        snapshotOf([held]),
        idsOf(),
      )

      expect(plan.kind === "write" && plan.writes.newItems).toEqual([
        {
          id: "fwd9s3hj",
          fields: [
            { field: "title", value: "Letters by email" },
            {
              field: "description",
              value: "Read your letters online.\nNo post.",
            },
            { field: "expectedOutcome", value: "Fewer lost letters" },
            { field: "phase", value: "Discovery" },
            { field: "placement", value: "delivered-this-year" },
            { field: "tags", value: "Patients, Carers" },
            { field: "organisationIds", value: "national,sbuhb" },
            {
              field: "details",
              value:
                "Appointment letters\n- Outpatients\n-- Adult clinics first",
            },
          ],
        },
        expect.objectContaining({ id: "ckn7q2xw" }),
      ])
    })

    it("goes with the roadmap's other changes, and an ID for each item without one that is no new item's", () => {
      const noId = createTestRoadmapItem("No ID yet")

      const plan = planRoadmapPublish(
        {
          ...NO_CHANGES,
          roadmap: { vision: { base: "", value: "A vision" } },
          items: [
            {
              item: held,
              position: 0,
              fields: { phase: { base: "", value: "Beta" } },
            },
          ],
          newItems: [NEW_CLINIC],
        },
        snapshotOf([held, noId]),
        idsOf("ckn7q2xw", "newidaaa"),
      )

      expect(plan).toEqual({
        kind: "write",
        writes: {
          roadmap: [{ field: "vision", value: "A vision" }],
          items: [{ index: 0, id: "bookingx", field: "phase", value: "Beta" }],
          ids: [{ index: 1, id: "newidaaa" }],
          removals: [],
          moves: [],
          orders: [],
          newItems: [expect.objectContaining({ id: "ckn7q2xw" })],
        },
      })
    })

    it("publishes nothing of it when an edit is refused, and is never itself a conflict or missing (S3)", () => {
      const edited = {
        item: held,
        position: 0,
        fields: { phase: { base: "", value: "Beta" } },
      }

      const conflict = planRoadmapPublish(
        { ...NO_CHANGES, items: [edited], newItems: [NEW_CLINIC] },
        snapshotOf([{ ...held, phase: { en: "Live", cy: "" } }]),
        idsOf(),
      )
      const gone = planRoadmapPublish(
        { ...NO_CHANGES, items: [edited], newItems: [NEW_CLINIC] },
        snapshotOf([]),
        idsOf(),
      )

      expect(conflict).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [expect.objectContaining({ field: "phase" })],
          missingItems: [],
        },
      })
      expect(gone).toEqual({
        kind: "settled",
        outcome: { status: "refused", conflicts: [], missingItems: [edited] },
      })
    })

    it("is written whatever a co-lead did to the roadmap's other items (S3)", () => {
      const plan = planRoadmapPublish(
        addingItems(NEW_CLINIC),
        snapshotOf([
          createTestRoadmapItem("Choose a clinic closer to home", {
            id: "theirsxx",
          }),
        ]),
        idsOf(),
      )

      expect(plan.kind === "write" && plan.writes.newItems).toEqual([
        expect.objectContaining({ id: "ckn7q2xw" }),
      ])
    })

    it("takes a new item whose ID the roadmap holds as published, read or in a row it skips (S4)", () => {
      const landed = createTestRoadmapItem("Renamed by a co-lead", {
        id: "ckn7q2xw",
      })

      expect(
        planRoadmapPublish(
          addingItems(NEW_CLINIC),
          snapshotOf([landed]),
          idsOf(),
        ),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
      expect(
        planRoadmapPublish(
          addingItems(NEW_CLINIC),
          snapshotOf([], ["ckn7q2xw"]),
          idsOf(),
        ),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
      const plan = planRoadmapPublish(
        addingItems(NEW_CLINIC, NEW_LETTERS),
        snapshotOf([landed]),
        idsOf(),
      )
      expect(plan.kind === "write" && plan.writes.newItems).toEqual([
        expect.objectContaining({ id: "fwd9s3hj" }),
      ])
    })

    it("says a roadmap no longer listed is not found, as for an edit (S3)", () => {
      expect(planRoadmapPublish(addingItems(NEW_CLINIC), null)).toEqual({
        kind: "settled",
        outcome: { status: "roadmap-not-found" },
      })
    })

    it.each([
      ["a blank title", { title: " " }],
      ["no placement", { placement: "" }],
      ["a placement that is none of the six", { placement: "Soon" }],
      ["an organisation the list doesn't hold", { organisationIds: "nowhere" }],
    ])("rejects %s, which the editor never sends", (_, values) => {
      const invalid = {
        id: "invalidx",
        values: { ...NEW_CLINIC.values, ...values },
      }

      expect(() =>
        planRoadmapPublish(addingItems(invalid), snapshotOf([held])),
      ).toThrow(expect.objectContaining({ kind: "unknown" }))
    })

    it("rejects two new items with one ID, which the editor never sends", () => {
      expect(() =>
        planRoadmapPublish(
          addingItems(NEW_CLINIC, { ...NEW_LETTERS, id: NEW_CLINIC.id }),
          snapshotOf([held]),
        ),
      ).toThrow(expect.objectContaining({ kind: "unknown" }))
    })
  })
})

describe("heldWrites", () => {
  const writes: PublishWrites = {
    roadmap: [{ field: "vision", value: "A vision" }],
    items: [{ index: 0, id: "newidaaa", field: "phase", value: "Live" }],
    ids: [{ index: 0, id: "newidaaa" }],
    removals: [],
    moves: [],
    orders: [],
    newItems: [],
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
      removals: [],
      moves: [],
      orders: [],
      newItems: [],
    }
    const alreadyLive = createTestRoadmapItem("Other", {
      phase: { en: "Live", cy: "" },
    })

    expect(heldWrites(itemWrites, snapshotOf([alreadyLive]))).toBe("none")
  })

  it("judges a move by its placement alone, wherever the item then is (STY-051 S8)", () => {
    const move: PublishWrites = {
      roadmap: [],
      items: [{ index: 0, id: "bookingx", field: "placement", value: "now" }],
      ids: [],
      removals: [],
      moves: [{ index: 0, after: 1 }],
      orders: [],
      newItems: [],
    }
    const booking = createTestRoadmapItem("Online booking", { id: "bookingx" })
    const other = createTestRoadmapItem("Other", { id: "otherxxx" })

    expect(heldWrites(move, snapshotOf([other, booking]))).toBe("all")
    // The write is all or nothing, so a co-lead moved the row back since.
    expect(heldWrites(move, snapshotOf([booking, other]))).toBe("all")
    expect(
      heldWrites(move, snapshotOf([{ ...booking, placement: "later" }, other])),
    ).toBe("none")
  })

  it("can't tell when a written item's row is still there but no longer read", () => {
    expect(heldWrites(writes, snapshotOf([], ["newidaaa"]))).toBe("some")
  })

  it("can't tell when the roadmap is no longer listed", () => {
    expect(heldWrites(writes, null)).toBe("some")
  })

  describe("a new item, held by its ID alone (STY-045 S4)", () => {
    const withNewItem: PublishWrites = {
      ...writes,
      newItems: [
        {
          id: "ckn7q2xw",
          fields: [
            { field: "title", value: "Choose a clinic closer to home" },
            { field: "placement", value: "next" },
          ],
        },
      ],
    }
    const landed = createTestRoadmapItem("Renamed by a co-lead", {
      id: "ckn7q2xw",
      placement: "later",
    })

    it("is all when every new item and written cell is there, whatever the new item now reads", () => {
      expect(
        heldWrites(withNewItem, {
          ...snapshotOf([after, landed]),
          roadmap: written,
        }),
      ).toBe("all")
      expect(
        heldWrites(
          {
            roadmap: [],
            items: [],
            ids: [],
            removals: [],
            moves: [],
            orders: [],
            newItems: withNewItem.newItems,
          },
          snapshotOf([before], ["ckn7q2xw"]),
        ),
      ).toBe("all")
    })

    it("is none when neither it nor any written cell is there", () => {
      expect(heldWrites(withNewItem, snapshotOf([before]))).toBe("none")
    })

    it("is some when it is there and a written cell is not, or the other way round", () => {
      expect(heldWrites(withNewItem, snapshotOf([before, landed]))).toBe("some")
      expect(
        heldWrites(withNewItem, { ...snapshotOf([after]), roadmap: written }),
      ).toBe("some")
    })
  })
})

describe("a placement's pending order (STY-050)", () => {
  const item = (title: string, placement: RoadmapPlacement = "now") =>
    createTestRoadmapItem(title, {
      id: `${title.toLowerCase()}idxxxx`,
      placement,
    })
  const a = item("A")
  const b = item("B")
  const c = item("C")
  const d = item("D")
  const idOf = (title: string) => `${title.toLowerCase()}idxxxx`
  const ids = (titles: string): OrderedItem[] =>
    titles.split("").map((title) => ({ id: idOf(title) }))
  /** Now reordered from `base` to `items`, each a run of one-letter titles. */
  const nowOrder = (base: string, items: string): PlacementOrder => ({
    placement: "now",
    base: ids(base),
    items: ids(items),
  })
  const reordering = (
    order: PlacementOrder,
    changes: Partial<RoadmapChanges> = {},
  ): RoadmapChanges => ({ ...NO_CHANGES, ...changes, orders: [order] })
  /** The conflict found over `current`, Now's items as the publish read them. */
  const conflictOf = (order: PlacementOrder, current: RoadmapItem[]) => ({
    subject: "order",
    placement: "now",
    base: order.base,
    pending: order.items,
    current: current.map((each) => ({
      item: { id: each.id },
      title: each.title,
    })),
  })

  it("moves the fewest rows to reach the order, writing no cell, and says what the placement then holds (S7)", () => {
    expect(
      planRoadmapPublish(
        reordering(nowOrder("ABCD", "DABC")),
        snapshotOf([a, b, c, d]),
        idsOf(),
      ),
    ).toEqual({
      kind: "write",
      writes: {
        roadmap: [],
        items: [],
        ids: [],
        removals: [],
        moves: [{ index: 3, before: 0 }],
        newItems: [],
        orders: [
          {
            placement: "now",
            items: [idOf("D"), idOf("A"), idOf("B"), idOf("C")],
            was: [idOf("A"), idOf("B"), idOf("C"), idOf("D")],
          },
        ],
      },
    })
  })

  it("gives each item without an ID one, as any write does, and finds it by what it held", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")
    const order: PlacementOrder = {
      placement: "now",
      base: [orderedItem(first, 0), orderedItem(second, 1)],
      items: [orderedItem(second, 1), orderedItem(first, 0)],
    }

    expect(
      planRoadmapPublish(
        reordering(order),
        snapshotOf([first, second]),
        idsOf("newidaaa", "newidbbb"),
      ),
    ).toEqual({
      kind: "write",
      writes: {
        roadmap: [],
        items: [],
        ids: [
          { index: 0, id: "newidaaa" },
          { index: 1, id: "newidbbb" },
        ],
        removals: [],
        moves: [{ index: 0, after: 1 }],
        newItems: [],
        orders: [
          {
            placement: "now",
            items: ["newidbbb", "newidaaa"],
            was: [null, null],
          },
        ],
      },
    })
  })

  it("writes nothing, not even IDs, for an order the roadmap already holds, whoever made it (S9)", () => {
    expect(
      planRoadmapPublish(
        reordering(nowOrder("ABCD", "DABC")),
        snapshotOf([d, item("Other", "next"), a, b, c]),
        idsOf(),
      ),
    ).toEqual({ kind: "settled", outcome: { status: "published" } })
  })

  describe("a co-lead's change to the placement's items (S10)", () => {
    const order = nowOrder("ABCD", "DABC")
    const theirs = item("E")

    it.each<[string, RoadmapItem[], RoadmapItem[]]>([
      ["reordered it", [b, a, c, d], [b, a, c, d]],
      ["added an item to it", [a, b, c, d, theirs], [a, b, c, d, theirs]],
      [
        "moved an item into it",
        [{ ...theirs, placement: "now" }, a, b, c, d],
        [{ ...theirs, placement: "now" }, a, b, c, d],
      ],
      [
        "moved an item out of it",
        [a, { ...b, placement: "later" }, c, d],
        [a, c, d],
      ],
      ["removed an item from it", [a, b, d], [a, b, d]],
    ])("is a conflict when a co-lead has %s", (_, items, current) => {
      expect(
        planRoadmapPublish(reordering(order), snapshotOf(items), idsOf()),
      ).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [conflictOf(order, current)],
          missingItems: [],
        },
      })
    })

    it("is none when a co-lead changed another placement, or an item's text", () => {
      const plan = planRoadmapPublish(
        reordering(order),
        snapshotOf([
          item("Theirs", "next"),
          { ...a, title: { en: "Their A", cy: "" } },
          b,
          c,
          d,
        ]),
        idsOf(),
      )

      expect(plan).toMatchObject({
        kind: "write",
        writes: { moves: [{ index: 4, before: 1 }] },
      })
    })

    it("publishes nothing else beside it, and names it after the fields in conflict", () => {
      const edit: ItemChanges = {
        item: a,
        position: 0,
        fields: { title: { base: "A", value: "My A" } },
      }
      const current = [{ ...a, title: { en: "Their A", cy: "" } }, c, b, d]

      const plan = planRoadmapPublish(
        reordering(order, { items: [edit] }),
        snapshotOf(current),
        idsOf(),
      )

      expect(plan).toMatchObject({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [
            { subject: "item", field: "title" },
            { subject: "order", placement: "now" },
          ],
        },
      })
    })

    it("reports an edited item a co-lead removed as not found, and no conflict when that was the only difference", () => {
      const edit: ItemChanges = {
        item: b,
        position: 1,
        fields: { title: { base: "B", value: "My B" } },
      }

      expect(
        planRoadmapPublish(
          reordering(order, { items: [edit] }),
          snapshotOf([a, c, d]),
          idsOf(),
        ),
      ).toEqual({
        kind: "settled",
        outcome: { status: "refused", conflicts: [], missingItems: [edit] },
      })
    })

    it("reports both when the order differs by more than the item removed", () => {
      const edit: ItemChanges = {
        item: b,
        position: 1,
        fields: { title: { base: "B", value: "My B" } },
      }

      expect(
        planRoadmapPublish(
          reordering(order, { items: [edit] }),
          snapshotOf([c, a, d]),
          idsOf(),
        ),
      ).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [conflictOf(order, [c, a, d])],
          missingItems: [edit],
        },
      })
    })
  })

  it("writes the order kept over a co-lead's change with their items last and their removals gone (S12)", () => {
    const theirs = item("E")
    // "Keep mine" made the order found the base: D, A, B, C over A, C, D and E.
    const kept: PlacementOrder = {
      placement: "now",
      base: ids("ACDE"),
      items: ids("DABC"),
    }

    expect(
      planRoadmapPublish(
        reordering(kept),
        snapshotOf([a, c, d, theirs]),
        idsOf(),
      ),
    ).toMatchObject({
      kind: "write",
      writes: {
        removals: [],
        moves: [{ index: 2, before: 0 }],
        orders: [
          {
            placement: "now",
            items: [idOf("D"), idOf("A"), idOf("C"), idOf("E")],
          },
        ],
      },
    })
  })

  describe("with the Product Lead's own moves and new items (S5, S8)", () => {
    const moved = item("X", "next")
    const move: ItemChanges = {
      item: moved,
      position: 0,
      fields: { placement: { base: "next", value: "now" } },
    }
    const added: NewItem = {
      ...NEW_CLINIC,
      values: { ...NEW_CLINIC.values, placement: "now" },
    }
    const addedId: OrderedItem = { id: NEW_CLINIC.id }
    const newFields = [
      { field: "title", value: "Choose a clinic closer to home" },
      { field: "placement", value: "now" },
    ]

    it("puts an item moved in where the order has it, and is no conflict though the placement lacks it", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: ids("AB"),
        items: [{ id: idOf("X") }, ...ids("AB")],
      }

      expect(
        planRoadmapPublish(
          reordering(order, { items: [move] }),
          snapshotOf([a, moved, b]),
          idsOf(),
        ),
      ).toEqual({
        kind: "write",
        writes: {
          roadmap: [],
          items: [
            { index: 1, id: idOf("X"), field: "placement", value: "now" },
          ],
          ids: [],
          removals: [],
          moves: [{ index: 0, after: 1 }],
          newItems: [],
          orders: [
            {
              placement: "now",
              items: [idOf("X"), idOf("A"), idOf("B")],
              was: [idOf("A"), idOf("B")],
            },
          ],
        },
      })
    })

    it("leaves out an item moved out, which goes last in its new placement", () => {
      const out: ItemChanges = {
        item: b,
        position: 1,
        fields: { placement: { base: "now", value: "next" } },
      }

      expect(
        planRoadmapPublish(
          reordering(nowOrder("ABC", "CA"), { items: [out] }),
          snapshotOf([a, b, c, moved]),
          idsOf(),
        ),
      ).toMatchObject({
        kind: "write",
        writes: {
          removals: [],
          moves: [
            { index: 0, after: 2 },
            { index: 1, after: 3 },
          ],
          orders: [
            {
              placement: "now",
              items: [idOf("C"), idOf("A")],
              was: [idOf("A"), idOf("B"), idOf("C")],
            },
          ],
        },
      })
    })

    it("inserts a new item that is not last before the item it precedes (S8)", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: ids("AB"),
        items: [{ id: idOf("A") }, addedId, { id: idOf("B") }],
      }

      expect(
        planRoadmapPublish(
          reordering(order, { newItems: [added] }),
          snapshotOf([a, moved, b]),
          idsOf(),
        ),
      ).toEqual({
        kind: "write",
        writes: {
          roadmap: [],
          items: [],
          ids: [],
          removals: [],
          moves: [],
          newItems: [{ id: NEW_CLINIC.id, fields: newFields, before: 2 }],
          orders: [
            {
              placement: "now",
              items: [idOf("A"), NEW_CLINIC.id, idOf("B")],
              was: [idOf("A"), idOf("B")],
            },
          ],
        },
      })
    })

    it("appends a new item that stays last, as before, and one joining a pending order last (S5, S8)", () => {
      const plan = planRoadmapPublish(
        reordering(nowOrder("AB", "BA"), { newItems: [added] }),
        snapshotOf([a, b]),
        idsOf(),
      )

      expect(plan).toMatchObject({
        kind: "write",
        writes: {
          removals: [],
          moves: [{ index: 0, after: 1 }],
          newItems: [{ id: NEW_CLINIC.id, fields: newFields }],
          orders: [{ items: [idOf("B"), idOf("A"), NEW_CLINIC.id] }],
        },
      })
      expect(plan).not.toHaveProperty("writes.newItems.0.before")
    })

    it("writes several new items in the order the placement has them, inserted or appended", () => {
      const second: NewItem = {
        id: "secondid",
        values: { ...added.values, title: "Second" },
      }
      const third: NewItem = {
        id: "thirdidx",
        values: { ...added.values, title: "Third" },
      }
      const order: PlacementOrder = {
        placement: "now",
        base: ids("A"),
        items: [
          { id: "thirdidx" },
          addedId,
          { id: idOf("A") },
          { id: "secondid" },
        ],
      }

      const plan = planRoadmapPublish(
        reordering(order, { newItems: [added, second, third] }),
        snapshotOf([a]),
        idsOf(),
      )

      expect(plan).toMatchObject({
        kind: "write",
        writes: {
          removals: [],
          moves: [],
          newItems: [
            { id: "thirdidx", before: 0 },
            { id: NEW_CLINIC.id, before: 0 },
            { id: "secondid" },
          ],
        },
      })
      expect(plan).not.toHaveProperty("writes.newItems.2.before")
    })

    it("takes a new item whose ID the roadmap holds as an item of it, written already", () => {
      const landed = createTestRoadmapItem("Choose a clinic closer to home", {
        id: NEW_CLINIC.id,
      })
      const order: PlacementOrder = {
        placement: "now",
        base: ids("AB"),
        items: [{ id: idOf("A") }, addedId, { id: idOf("B") }],
      }

      expect(
        planRoadmapPublish(
          reordering(order, { newItems: [added] }),
          snapshotOf([a, landed, b]),
          idsOf(),
        ),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
    })
  })

  describe("a lost answer, judged by the placement's order (S14)", () => {
    const writes: PublishWrites = {
      roadmap: [],
      items: [],
      ids: [],
      removals: [],
      moves: [{ index: 3, before: 0 }],
      newItems: [],
      orders: [
        {
          placement: "now",
          items: [idOf("D"), idOf("A"), idOf("B"), idOf("C")],
          was: [idOf("A"), idOf("B"), idOf("C"), idOf("D")],
        },
      ],
    }
    const elsewhere = item("Other", "next")

    it("is all when the placement holds the pending order, whatever lies between", () => {
      expect(heldWrites(writes, snapshotOf([d, elsewhere, a, b, c]))).toBe(
        "all",
      )
    })

    it("is none when it holds the order it had", () => {
      expect(heldWrites(writes, snapshotOf([a, b, elsewhere, c, d]))).toBe(
        "none",
      )
    })

    it("is some when it holds any other, as after a co-lead's change", () => {
      expect(heldWrites(writes, snapshotOf([d, a, c, b]))).toBe("some")
      expect(heldWrites(writes, snapshotOf([a, b, c]))).toBe("some")
    })

    it("is some when the order is there and another write is not", () => {
      expect(
        heldWrites(
          { ...writes, roadmap: [{ field: "vision", value: "A vision" }] },
          snapshotOf([d, a, b, c]),
        ),
      ).toBe("some")
    })

    it("tells an order of items given their IDs by the same write", () => {
      const first = createTestRoadmapItem("First")
      const second = createTestRoadmapItem("Second")
      const given: PublishWrites = {
        ...writes,
        ids: [
          { index: 0, id: "newidaaa" },
          { index: 1, id: "newidbbb" },
        ],
        removals: [],
        moves: [{ index: 0, after: 1 }],
        orders: [
          {
            placement: "now",
            items: ["newidbbb", "newidaaa"],
            was: [null, null],
          },
        ],
      }

      expect(heldWrites(given, snapshotOf([first, second]))).toBe("none")
      expect(
        heldWrites(
          given,
          snapshotOf([
            { ...second, id: "newidbbb" },
            { ...first, id: "newidaaa" },
          ]),
        ),
      ).toBe("all")
    })
  })
})

describe("a removed item (STY-070)", () => {
  const item = (title: string, placement: RoadmapPlacement = "now") =>
    createTestRoadmapItem(title, {
      id: `${title.toLowerCase()}idxxxx`,
      placement,
    })
  const a = item("A")
  const b = item("B")
  const c = item("C")
  const idOf = (title: string) => `${title.toLowerCase()}idxxxx`
  const removing = (
    removals: RoadmapChanges["removals"],
    changes: Partial<RoadmapChanges> = {},
  ): RoadmapChanges => ({ ...NO_CHANGES, ...changes, removals })
  /** A write of `removals` alone, and of nothing else. */
  const removalsOnly = (
    removals: PublishWrites["removals"],
    writes: Partial<PublishWrites> = {},
  ) => ({
    kind: "write",
    writes: {
      roadmap: [],
      items: [],
      ids: [],
      removals,
      moves: [],
      newItems: [],
      orders: [],
      ...writes,
    },
  })

  it("deletes the item's row, found by its ID (S2)", () => {
    expect(
      planRoadmapPublish(
        removing([{ item: b, position: 1 }]),
        snapshotOf([a, b, c]),
        idsOf(),
      ),
    ).toEqual(removalsOnly([{ index: 1, item: b }]))
  })

  it("finds it by its ID wherever a co-lead's reorder has put it, which is no conflict (S4)", () => {
    expect(
      planRoadmapPublish(
        removing([{ item: b, position: 1 }]),
        snapshotOf([b, c, a]),
        idsOf(),
      ),
    ).toEqual(removalsOnly([{ index: 0, item: b }]))
  })

  it("publishes none of the item's edits, which stay beneath the removal (S1)", () => {
    const edit: ItemChanges = {
      item: b,
      position: 1,
      fields: {
        phase: { base: "", value: "Live" },
        placement: { base: "now", value: "later" },
      },
    }

    expect(
      planRoadmapPublish(
        removing([{ item: b, position: 1 }], { items: [edit] }),
        snapshotOf([a, b, c]),
        idsOf(),
      ),
    ).toEqual(removalsOnly([{ index: 1, item: b }]))
  })

  it("removes an item without an ID at its position, giving it none, while every other item without one gets one (S2)", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")

    expect(
      planRoadmapPublish(
        removing([{ item: second, position: 1 }]),
        snapshotOf([first, second]),
        idsOf("newidaaa", "newidbbb"),
      ),
    ).toEqual(
      removalsOnly([{ index: 1, item: second }], {
        ids: [{ index: 0, id: "newidaaa" }],
      }),
    )
  })

  it("deletes several, each with the roadmap's other changes in the one write (S2)", () => {
    const plan = planRoadmapPublish(
      removing(
        [
          { item: c, position: 2 },
          { item: a, position: 0 },
        ],
        { roadmap: { vision: { base: "", value: "A vision" } } },
      ),
      snapshotOf([a, b, c]),
      idsOf(),
    )

    expect(plan).toEqual(
      removalsOnly(
        [
          { index: 2, item: c },
          { index: 0, item: a },
        ],
        { roadmap: [{ field: "vision", value: "A vision" }] },
      ),
    )
  })

  describe("a co-lead's change to the item (S4)", () => {
    it.each<[string, Partial<RoadmapItem>, string, string, string]>([
      [
        "its description",
        { description: { en: "Theirs", cy: "" } },
        "description",
        "",
        "Theirs",
      ],
      ["its horizon", { placement: "later" }, "placement", "now", "later"],
      ["its tags", { tags: [{ en: "Carers", cy: "" }] }, "tags", "", "Carers"],
    ])(
      "refuses the publish when they changed %s, loaded beside current",
      (_, changed, field, base, current) => {
        const theirs = { ...b, ...changed }
        const removal = { item: b, position: 1 }

        expect(
          planRoadmapPublish(
            removing([removal], {
              roadmap: { vision: { base: "", value: "A vision" } },
            }),
            snapshotOf([a, theirs, c]),
            idsOf(),
          ),
        ).toEqual({
          kind: "settled",
          outcome: {
            status: "refused",
            conflicts: [
              {
                subject: "removal",
                removal,
                current: theirs,
                fields: [{ field, base, current }],
              },
            ],
            missingItems: [],
          },
        })
      },
    )

    it.each<[string, Partial<RoadmapItem>, Partial<RoadmapItem>, string]>([
      [
        "its Welsh alone",
        { title: { en: "B", cy: "B" } },
        { title: { en: "B", cy: "B, wedi'i ailenwi" } },
        "title",
      ],
      [
        "the horizon written of an item still unplaced",
        { placement: null, writtenHorizon: "Soon" },
        { placement: null, writtenHorizon: "Someday" },
        "placement",
      ],
      [
        "a code the organisation list doesn't know",
        { unknownOrganisationCodes: [] },
        { unknownOrganisationCodes: ["XYZ"] },
        "organisationIds",
      ],
      [
        "its tags' Welsh",
        { tags: [{ en: "Carers", cy: "" }] },
        { tags: [{ en: "Carers", cy: "Gofalwyr" }], hasWelshTags: true },
        "tags",
      ],
    ])(
      "refuses the publish when they changed %s, which the field's English doesn't show (STY-049 D2)",
      (_, loaded, changed, field) => {
        const mine = { ...b, ...loaded }
        const theirs = { ...mine, ...changed }
        const removal = { item: mine, position: 1 }

        const plan = planRoadmapPublish(
          removing([removal]),
          snapshotOf([a, theirs, c]),
          idsOf(),
        )

        expect(plan.kind === "settled" && plan.outcome).toMatchObject({
          status: "refused",
          conflicts: [
            {
              subject: "removal",
              removal,
              current: theirs,
              fields: [{ field }],
            },
          ],
        })
      },
    )

    it("gives the removal itself, with each field changed in the form's order", () => {
      const theirs = {
        ...b,
        title: { en: "B, renamed", cy: "" },
        phase: { en: "Beta", cy: "" },
      }
      const removal = { item: b, position: 1 }

      const plan = planRoadmapPublish(
        removing([removal]),
        snapshotOf([a, theirs]),
        idsOf(),
      )

      expect(plan.kind === "settled" && plan.outcome).toEqual({
        status: "refused",
        conflicts: [
          {
            subject: "removal",
            removal,
            current: theirs,
            fields: [
              { field: "title", base: "B", current: "B, renamed" },
              { field: "phase", base: "", current: "Beta" },
            ],
          },
        ],
        missingItems: [],
      })
      expect(
        plan.kind === "settled" &&
          plan.outcome.status === "refused" &&
          plan.outcome.conflicts[0]?.subject === "removal" &&
          plan.outcome.conflicts[0].removal,
      ).toBe(removal)
    })
  })

  describe("an item already gone (S5)", () => {
    it("counts one whose ID no row holds as removed, and publishes the rest", () => {
      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }], {
            roadmap: { vision: { base: "", value: "A vision" } },
          }),
          snapshotOf([a, c]),
          idsOf(),
        ),
      ).toEqual(
        removalsOnly([], {
          roadmap: [{ field: "vision", value: "A vision" }],
        }),
      )
    })

    it("writes nothing when it was the only change", () => {
      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }]),
          snapshotOf([a, c]),
          idsOf(),
        ),
      ).toEqual({ kind: "settled", outcome: { status: "published" } })
    })

    it("refuses one whose ID a row the read skips still holds", () => {
      const removal = { item: b, position: 1 }

      expect(
        planRoadmapPublish(
          removing([removal]),
          snapshotOf([a, c], [idOf("B")]),
          idsOf(),
        ),
      ).toEqual({
        kind: "settled",
        outcome: { status: "refused", conflicts: [], missingItems: [removal] },
      })
    })

    it.each<[string, RoadmapItem[]]>([
      [
        "a co-lead edited",
        [
          createTestRoadmapItem("First"),
          createTestRoadmapItem("Second", { phase: { en: "Beta", cy: "" } }),
        ],
      ],
      [
        "a co-lead moved a row past",
        [createTestRoadmapItem("Second"), createTestRoadmapItem("First")],
      ],
      ["a co-lead deleted", [createTestRoadmapItem("First")]],
    ])("refuses one without an ID that %s, as not found (D3)", (_, current) => {
      const removal = {
        item: createTestRoadmapItem("Second"),
        position: 1,
      }

      expect(
        planRoadmapPublish(removing([removal]), snapshotOf(current), idsOf()),
      ).toEqual({
        kind: "settled",
        outcome: {
          status: "refused",
          conflicts: [],
          missingItems: [removal],
        },
      })
    })

    it("refuses one with a repeated ID whose first row no longer holds what was loaded (D3)", () => {
      const removal = { item: b, position: 1 }
      const theirs = { ...b, phase: { en: "Beta", cy: "" } }

      expect(
        planRoadmapPublish(
          removing([removal]),
          {
            ...snapshotOf([a, theirs, { ...b, id: null }]),
            repeatedIds: new Set([idOf("B")]),
          },
          idsOf("newidaaa"),
        ),
      ).toEqual({
        kind: "settled",
        outcome: { status: "refused", conflicts: [], missingItems: [removal] },
      })
    })

    it("removes the first row of a repeated ID that still holds what was loaded, giving the copy a new one", () => {
      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }]),
          {
            ...snapshotOf([a, b, { ...b, id: null }]),
            repeatedIds: new Set([idOf("B")]),
          },
          idsOf("newidaaa"),
        ),
      ).toEqual(
        removalsOnly([{ index: 1, item: b }], {
          ids: [{ index: 2, id: "newidaaa" }],
        }),
      )
    })
  })

  describe("with a move, a pending order and a new item (S1, S2)", () => {
    it("moves no row for the removed item, which a moved item need not pass", () => {
      const moving = item("M", "next")

      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 2 }], {
            items: [
              {
                item: moving,
                position: 1,
                fields: { placement: { base: "next", value: "now" } },
              },
            ],
          }),
          snapshotOf([a, moving, b]),
          idsOf(),
        ),
      ).toEqual(
        removalsOnly([{ index: 2, item: b }], {
          items: [
            { index: 1, id: idOf("M"), field: "placement", value: "now" },
          ],
        }),
      )
    })

    it("leaves the removed item out of its placement's pending order", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: [{ id: idOf("A") }, { id: idOf("B") }, { id: idOf("C") }],
        items: [{ id: idOf("C") }, { id: idOf("B") }, { id: idOf("A") }],
      }

      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }], { orders: [order] }),
          snapshotOf([a, b, c]),
          idsOf(),
        ),
      ).toEqual(
        removalsOnly([{ index: 1, item: b }], {
          moves: [{ index: 0, after: 2 }],
          orders: [
            {
              placement: "now",
              items: [idOf("C"), idOf("A")],
              was: [idOf("A"), idOf("B"), idOf("C")],
            },
          ],
        }),
      )
    })

    it("writes only the removal for an order the removal alone makes", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: [{ id: idOf("A") }, { id: idOf("B") }],
        items: [{ id: idOf("B") }, { id: idOf("A") }],
      }

      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }], { orders: [order] }),
          snapshotOf([a, b]),
          idsOf(),
        ),
      ).toEqual(
        removalsOnly([{ index: 1, item: b }], {
          orders: [
            {
              placement: "now",
              items: [idOf("A")],
              was: [idOf("A"), idOf("B")],
            },
          ],
        }),
      )
    })

    it("sees no co-lead change to an order in an item already gone", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: [{ id: idOf("A") }, { id: idOf("B") }, { id: idOf("C") }],
        items: [{ id: idOf("C") }, { id: idOf("B") }, { id: idOf("A") }],
      }

      expect(
        planRoadmapPublish(
          removing([{ item: b, position: 1 }], { orders: [order] }),
          snapshotOf([a, c]),
          idsOf(),
        ),
      ).toEqual(
        removalsOnly([], {
          moves: [{ index: 0, after: 1 }],
          orders: [
            {
              placement: "now",
              items: [idOf("C"), idOf("A")],
              was: [idOf("A"), idOf("C")],
            },
          ],
        }),
      )
    })

    it("inserts a new item before the next item the order keeps, never before the removed one", () => {
      const order: PlacementOrder = {
        placement: "now",
        base: [{ id: idOf("A") }, { id: idOf("B") }, { id: idOf("C") }],
        items: [
          { id: idOf("A") },
          { id: NEW_CLINIC.id },
          { id: idOf("B") },
          { id: idOf("C") },
        ],
      }
      const clinic: NewItem = {
        ...NEW_CLINIC,
        values: { ...NEW_CLINIC.values, placement: "now" },
      }

      const plan = planRoadmapPublish(
        removing([{ item: b, position: 1 }], {
          orders: [order],
          newItems: [clinic],
        }),
        snapshotOf([a, b, c]),
        idsOf(),
      )

      expect(plan.kind === "write" && plan.writes.newItems).toEqual([
        expect.objectContaining({ id: NEW_CLINIC.id, before: 2 }),
      ])
      expect(plan.kind === "write" && plan.writes.removals).toEqual([
        { index: 1, item: b },
      ])
    })
  })
})

describe("heldWrites with a removed item (STY-070 S6)", () => {
  const a = createTestRoadmapItem("A", { id: "aidxxxxx" })
  const b = createTestRoadmapItem("B", { id: "bidxxxxx" })
  const nothing: PublishWrites = {
    roadmap: [],
    items: [],
    ids: [],
    removals: [],
    moves: [],
    orders: [],
    newItems: [],
  }
  const written = { ...roadmap, vision: { en: "A vision", cy: "" } }
  const withVision: PublishWrites = {
    ...nothing,
    roadmap: [{ field: "vision", value: "A vision" }],
  }

  it("holds a removal with an ID when no row holds the ID", () => {
    const writes = { ...withVision, removals: [{ index: 1, item: b }] }

    expect(heldWrites(writes, { ...snapshotOf([a]), roadmap: written })).toBe(
      "all",
    )
    expect(heldWrites(writes, snapshotOf([a, b]))).toBe("none")
    expect(heldWrites(writes, snapshotOf([a]))).toBe("some")
    expect(
      heldWrites(writes, { ...snapshotOf([a, b]), roadmap: written }),
    ).toBe("some")
    // A row the read skips (its title cleared since) still holds it.
    expect(
      heldWrites(writes, {
        ...snapshotOf([a], ["bidxxxxx"]),
        roadmap: written,
      }),
    ).toBe("some")
  })

  describe("an item without an ID", () => {
    const first = createTestRoadmapItem("First")
    const second = createTestRoadmapItem("Second")
    const third = createTestRoadmapItem("Third")
    const removing = { ...nothing, removals: [{ index: 1, item: second }] }

    it("is held when its position no longer holds what was loaded, alone", () => {
      expect(heldWrites(removing, snapshotOf([first, third]))).toBe("all")
      expect(heldWrites(removing, snapshotOf([first]))).toBe("all")
      expect(heldWrites(removing, snapshotOf([first, second, third]))).toBe(
        "none",
      )
    })

    it("is held only when every other write is found written", () => {
      const writes = {
        ...withVision,
        removals: [{ index: 1, item: second }],
      }

      expect(
        heldWrites(writes, { ...snapshotOf([first, third]), roadmap: written }),
      ).toBe("all")
      expect(heldWrites(writes, snapshotOf([first, third]))).toBe("some")
      expect(heldWrites(writes, snapshotOf([first, second, third]))).toBe(
        "none",
      )
      expect(
        heldWrites(writes, {
          ...snapshotOf([first, second, third]),
          roadmap: written,
        }),
      ).toBe("some")
    })
  })
})
