import { describe, expect, it, vi } from "vitest"

import { addNewItem } from "@/domain/roadmap/new-item"
import { NO_CHANGES } from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"

import { editItem, editRoadmap } from "./pending-changes"
import { createPendingChangesStore, discardable } from "./pending-changes-store"
import { reorderItem } from "./pending-orders"

const roadmap = createTestRoadmap("producta", "Product A")
const retitled = editRoadmap(NO_CHANGES, roadmap, { title: "Product A2" })

describe("createPendingChangesStore", () => {
  it("keeps a roadmap's changes until an edit leaves none, then forgets the roadmap", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    expect(store.getSnapshot().changes.get("producta")).toBe(retitled)

    store.update("producta", (changes) =>
      editRoadmap(changes, roadmap, { title: "Product A" }),
    )
    expect(store.getSnapshot().changes.has("producta")).toBe(false)
  })

  it("keeps a roadmap whose only change is a new item (STY-045 S1)", () => {
    const store = createPendingChangesStore()

    store.update("producta", (changes) =>
      addNewItem(changes, { title: "Online booking", placement: "now" }, []),
    )

    expect(store.getSnapshot().changes.get("producta")?.newItems).toHaveLength(
      1,
    )
  })

  describe("a pending order (STY-050)", () => {
    const first = createTestRoadmapItem("First", { id: "firstidx" })
    const second = createTestRoadmapItem("Second", { id: "secondid" })
    const moved = createTestRoadmapItem("Moved", {
      id: "movedidx",
      placement: "next",
    })
    const items = [first, second, moved]

    it("is settled against the roadmap's items as last read by every update, whatever it changes (S5, D12)", () => {
      const store = createPendingChangesStore((roadmapId) =>
        roadmapId === "producta" ? items : undefined,
      )
      const orderOf = () =>
        store
          .getSnapshot()
          .changes.get("producta")
          ?.orders[0]?.items.map(({ id }) => id)
      // Moved goes to Now, last, then first: an order is pending.
      store.update("producta", (changes) =>
        editItem(changes, undefined, moved, 2, { placement: "now" }),
      )
      store.update("producta", (changes) =>
        reorderItem(changes, items, 2, "top"),
      )
      expect(orderOf()).toEqual(["movedidx", "firstidx", "secondid"])

      // Its move is undone by an update that knows nothing of orders.
      store.update("producta", (changes) => ({ ...changes, items: [] }))

      expect(store.getSnapshot().changes.has("producta")).toBe(false)
    })

    it("waits as it is while the roadmap's items are not read, as after Disconnect and Keep (S9)", () => {
      const store = createPendingChangesStore()
      const reordered = reorderItem(NO_CHANGES, items, 1, "top")

      store.update("producta", () => reordered)
      store.update("producta", (changes) =>
        editRoadmap(changes, roadmap, { title: "Product A2" }),
      )

      expect(store.getSnapshot().changes.get("producta")?.orders).toEqual(
        reordered.orders,
      )
    })
  })

  it("discards one roadmap's changes and leaves another's", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    store.update("productb", () => retitled)

    store.discard("producta")
    store.discard("productc")

    expect([...store.getSnapshot().changes.keys()]).toEqual(["productb"])
  })

  it("does not notify when an update changes nothing", () => {
    const store = createPendingChangesStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.update("producta", (changes) => changes)
    store.discard("producta")
    store.discardAll()
    store.clearNotices()
    expect(listener).not.toHaveBeenCalled()
  })

  it("refuses a second publish of a roadmap while one is under way", () => {
    const store = createPendingChangesStore()
    expect(store.startPublish("producta")).toBe(true)
    expect(store.startPublish("producta")).toBe(false)
    expect(store.startPublish("productb")).toBe(true)

    store.finishPublish("producta", { kind: "published", action: "publish" })
    expect(store.getSnapshot().publishing).toEqual(new Set(["productb"]))
    expect(store.startPublish("producta")).toBe(true)
  })

  it("clears a roadmap's notice when its next publish starts", () => {
    const store = createPendingChangesStore()
    store.startPublish("producta")
    const refused = {
      kind: "refused",
      action: "save",
      conflicts: [],
      removed: [],
    } as const
    store.finishPublish("producta", refused)
    expect(store.getSnapshot().notices.get("producta")).toEqual(refused)

    store.startPublish("producta")
    expect(store.getSnapshot().notices.has("producta")).toBe(false)
  })

  it("discards every roadmap's changes but keeps its notices; clears notices apart", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    store.update("productb", () => retitled)
    store.startPublish("productc")
    store.finishPublish("productc", {
      kind: "failed",
      error: "network",
      action: "publish",
    })

    store.discardAll()
    expect(store.getSnapshot().changes.size).toBe(0)
    expect(store.getSnapshot().notices.size).toBe(1)

    store.clearNotices()
    expect(store.getSnapshot().notices.size).toBe(0)
  })

  it("forgets each decided conflict of a refusal, then the refusal, so none reopens", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    const conflict = {
      subject: "roadmap",
      field: "title",
      base: "Product A",
      pending: "Product A2",
      current: "Product A, theirs",
    } as const
    const gone = { en: "Gone", cy: "" }
    store.startPublish("producta")
    store.finishPublish("producta", {
      kind: "refused",
      action: "publish",
      conflicts: [conflict],
      removed: [gone],
    })

    store.update("producta", () => NO_CHANGES)
    expect(store.getSnapshot().notices.get("producta")).toEqual({
      kind: "refused",
      action: "publish",
      conflicts: [],
      removed: [gone],
    })
    store.update("producta", () =>
      editRoadmap(NO_CHANGES, roadmap, { title: "Product A3" }),
    )
    expect(store.getSnapshot().notices.get("producta")).toMatchObject({
      conflicts: [],
    })

    store.startPublish("producta")
    store.finishPublish("producta", {
      kind: "refused",
      action: "publish",
      conflicts: [{ ...conflict, pending: "Product A3" }],
      removed: [],
    })
    store.update("producta", () => NO_CHANGES)
    expect(store.getSnapshot().notices.has("producta")).toBe(false)
  })

  it("ends a publish with no notice when it has nothing to say", () => {
    const store = createPendingChangesStore()
    store.startPublish("producta")
    store.finishPublish("producta", null)

    expect(store.getSnapshot().publishing.size).toBe(0)
    expect(store.getSnapshot().notices.size).toBe(0)
  })

  it("forgets a removed roadmap's changes and notice, remembering it was removed until listed again", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    store.startPublish("producta")
    store.finishPublish("producta", { kind: "published", action: "publish" })
    store.removeRoadmap("productb")
    expect(store.getSnapshot().removed.size).toBe(0)

    store.removeRoadmap("producta")
    expect(store.getSnapshot().changes.size).toBe(0)
    expect(store.getSnapshot().notices.size).toBe(0)
    expect(store.getSnapshot().removed).toEqual(new Set(["producta"]))

    const listener = vi.fn()
    store.subscribe(listener)
    store.removeRoadmap("producta")
    store.restoreRoadmaps(["productb"])
    expect(listener).not.toHaveBeenCalled()

    store.restoreRoadmaps(["productb", "producta"])
    expect(store.getSnapshot().removed.size).toBe(0)
  })

  it("holds a roadmap's changes from discarding only while a publish of them is under way", () => {
    const store = createPendingChangesStore()
    store.update("producta", () => retitled)
    store.startPublish("producta")

    expect(discardable(store.getSnapshot(), "producta")).toBe(false)
    expect(discardable(store.getSnapshot(), "productb")).toBe(true)

    store.finishPublish("producta", null)
    expect(discardable(store.getSnapshot(), "producta")).toBe(true)
  })
})
