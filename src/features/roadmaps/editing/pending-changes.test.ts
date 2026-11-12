import { describe, expect, it } from "vitest"

import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import {
  applyItemChanges,
  applyRoadmapChanges,
  countChanges,
  editItem,
  editRoadmap,
  matchItemChanges,
  NO_CHANGES,
  reconcileItems,
  reconcileRoadmap,
  settlePublished,
  undoItem,
} from "./pending-changes"

const roadmap = createTestRoadmap("producta", "Product A", {
  vision: { en: "A vision", cy: "Gweledigaeth" },
})
const first = createTestRoadmapItem("First", { id: "firstidx" })
const second = createTestRoadmapItem("Second")

describe("editRoadmap", () => {
  it("keeps trimmed values with the loaded text as their base", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "  New title ",
      vision: "",
      productLead: "",
    })

    expect(changes.roadmap).toEqual({
      title: { base: "Product A", value: "New title" },
      vision: { base: "A vision", value: "" },
    })
  })

  it("keeps the first base over later edits, and drops an edit back to it", () => {
    const once = editRoadmap(NO_CHANGES, roadmap, { title: "Second title" })
    const reread = createTestRoadmap("producta", "Co-lead's title")

    const twice = editRoadmap(once, reread, { title: "Third title" })
    expect(twice.roadmap.title).toEqual({
      base: "Product A",
      value: "Third title",
    })
    expect(editRoadmap(twice, reread, { title: "Product A" }).roadmap).toEqual(
      {},
    )
    expect(
      editRoadmap(twice, reread, { title: "Co-lead's title" }).roadmap,
    ).toEqual({})
  })
})

describe("editItem", () => {
  it("adds an entry, replaces it on the next edit and removes it when nothing differs", () => {
    const added = editItem(NO_CHANGES, undefined, second, 1, {
      title: "Second",
      phase: " Beta ",
    })
    expect(added.items).toEqual([
      {
        item: second,
        position: 1,
        fields: { phase: { base: "", value: "Beta" } },
      },
    ])

    const [entry] = added.items
    const replaced = editItem(added, entry, second, 1, { phase: "Live" })
    expect(replaced.items).toEqual([
      {
        item: second,
        position: 1,
        fields: { phase: { base: "", value: "Live" } },
      },
    ])

    expect(
      editItem(replaced, replaced.items[0], second, 1, { phase: "" }).items,
    ).toEqual([])
  })

  it("undoes one item without touching another", () => {
    const one = editItem(NO_CHANGES, undefined, first, 0, { title: "One" })
    const both = editItem(one, undefined, second, 1, { title: "Two" })
    const [firstEntry] = both.items
    if (!firstEntry) throw new Error("expected an entry")

    expect(undoItem(both, firstEntry).items).toEqual([both.items[1]])
  })
})

describe("matchItemChanges", () => {
  it("finds an item by its ID wherever it moved, and one without by its place and content", () => {
    let changes = editItem(NO_CHANGES, undefined, first, 0, { title: "One" })
    changes = editItem(changes, undefined, second, 1, { title: "Two" })

    const moved = matchItemChanges([second, first], changes)
    expect(moved.get(1)).toBe(changes.items[0])
    expect(moved.has(0)).toBe(false)

    const same = matchItemChanges([first, second], changes)
    expect(same.get(0)).toBe(changes.items[0])
    expect(same.get(1)).toBe(changes.items[1])
  })
})

describe("reconcile", () => {
  it("drops what a fresh read already holds and keeps the rest, bases unchanged", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "New title",
      vision: "New vision",
    })
    const reread = { ...roadmap, title: { en: "New title", cy: "" } }

    expect(reconcileRoadmap(changes, reread).roadmap).toEqual({
      vision: { base: "A vision", value: "New vision" },
    })
    expect(reconcileRoadmap(changes, roadmap)).toBe(changes)
  })

  it("follows an item to its new place, drops held fields and keeps an item not found", () => {
    let changes = editItem(NO_CHANGES, undefined, first, 0, {
      title: "One",
      phase: "Beta",
    })
    changes = editItem(changes, undefined, second, 1, { title: "Two" })
    const firstNow = { ...first, title: { en: "One", cy: "" } }
    const other = createTestRoadmapItem("Other")

    const reconciled = reconcileItems(changes, [other, firstNow])

    expect(reconciled.items).toEqual([
      {
        item: firstNow,
        position: 1,
        fields: { phase: { base: "", value: "Beta" } },
      },
      changes.items[1],
    ])
  })
})

describe("settlePublished", () => {
  it("removes what was sent and keeps edits made since", () => {
    const sent = editItem(
      editRoadmap(NO_CHANGES, roadmap, { title: "Sent", vision: "Sent" }),
      undefined,
      first,
      0,
      { title: "Sent" },
    )
    const [sentEntry] = sent.items
    const since: RoadmapChanges = editItem(
      editRoadmap(sent, roadmap, { vision: "Later" }),
      sentEntry,
      first,
      0,
      { phase: "Later" },
    )

    const settled = settlePublished(since, sent)

    expect(settled.roadmap).toEqual({
      vision: { base: "A vision", value: "Later" },
    })
    expect(settled.items.map(({ fields }) => fields)).toEqual([
      { phase: { base: "", value: "Later" } },
    ])
    expect(countChanges(settlePublished(sent, sent))).toBe(0)
  })
})

describe("apply", () => {
  it("shows the pending English and keeps the Welsh; a cleared field reads as none", () => {
    const changes = editRoadmap(NO_CHANGES, roadmap, {
      title: "New title",
      vision: "",
      productLead: "Sam Evans",
    })

    expect(applyRoadmapChanges(roadmap, changes)).toMatchObject({
      title: { en: "New title", cy: "" },
      vision: null,
      productLead: "Sam Evans",
    })

    const item = createTestRoadmapItem("Item", {
      description: { en: "Old", cy: "Hen" },
    })
    const edited = editItem(NO_CHANGES, undefined, item, 0, {
      description: "New",
    })
    expect(applyItemChanges(item, edited.items[0]).description).toEqual({
      en: "New",
      cy: "Hen",
    })
  })
})
