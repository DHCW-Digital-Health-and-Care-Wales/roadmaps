import { describe, expect, it, vi } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"

import { editRoadmap, NO_CHANGES } from "./pending-changes"
import { createPendingChangesStore } from "./pending-changes-store"

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
})
