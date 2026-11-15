import { describe, expect, it, vi } from "vitest"

import { addNewItem, removeNewItem } from "@/domain/roadmap/new-item"
import { NO_CHANGES } from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"

import { editRoadmap } from "./pending-changes"
import { createPendingChangesStore, discardable } from "./pending-changes-store"

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
    store.finishPublish("producta", { kind: "unconfirmed", action: "publish" })
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

  describe("a published new item no read has held (DEF-009)", () => {
    /** A store holding two new items of `producta`, with IDs `a` and `b`. */
    function withTwoNewItems() {
      const store = createPendingChangesStore()
      const ids = ["a", "b"]
      store.update("producta", (changes) =>
        [
          { title: "Online booking", placement: "now" },
          { title: "Text reminders", placement: "next" },
        ].reduce(
          (added, input) =>
            addNewItem(added, input, [], () => ids.shift() ?? ""),
          changes,
        ),
      )
      return store
    }

    it("holds that item and every change of its roadmap, leaving another new item and roadmap free", () => {
      const store = withTwoNewItems()

      store.keepPublished("producta", ["a"])

      const snapshot = store.getSnapshot()
      expect(discardable(snapshot, "producta", "a")).toBe(false)
      expect(discardable(snapshot, "producta", "b")).toBe(true)
      expect(discardable(snapshot, "producta")).toBe(false)
      expect(discardable(snapshot, "productb")).toBe(true)
    })

    it("is forgotten once it is no longer pending, and its roadmap once none is", () => {
      const store = withTwoNewItems()
      store.keepPublished("producta", ["a", "b"])

      store.update("producta", (changes) => removeNewItem(changes, "a"))
      expect(store.getSnapshot().publishedNewItems.get("producta")).toEqual(
        new Set(["b"]),
      )

      store.discard("producta")
      expect(store.getSnapshot().publishedNewItems.size).toBe(0)
    })

    it("does not notify when none is kept", () => {
      const store = withTwoNewItems()
      const listener = vi.fn()
      store.subscribe(listener)

      store.keepPublished("producta", [])

      expect(listener).not.toHaveBeenCalled()
    })
  })
})
