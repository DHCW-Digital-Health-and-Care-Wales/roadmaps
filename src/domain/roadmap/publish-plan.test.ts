import { describe, expect, it } from "vitest"

import { isAppError } from "@/lib/errors"

import {
  heldWrites,
  planRoadmapPublish,
  type PublishWrites,
  type RoadmapSnapshot,
} from "./publish-plan"
import { type NewItem, NO_CHANGES, UNLISTED_FAMILY } from "./roadmap-changes"
import type { RoadmapItem } from "./roadmap-item"
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
        moves: [],
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
          moves: [],
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
          moves: [],
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
          moves: [{ index: 0, after: 2 }],
          newItems: [],
        })
      })

      it("writes the placement alone for a row already last there (S5)", () => {
        const plan = planRoadmapPublish(
          { ...NO_CHANGES, items: [toNow(later, 2)] },
          snapshotOf([a, b, later]),
        )

        expect(plan.kind === "write" && plan.writes).toMatchObject({
          items: [
            { index: 2, id: "bookingx", field: "placement", value: "now" },
          ],
          moves: [],
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
          moves: [],
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
          moves: [],
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
          moves: [],
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
          moves: [],
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
          moves: [],
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
    moves: [],
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
      moves: [],
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
      moves: [{ index: 0, after: 1 }],
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
            moves: [],
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
