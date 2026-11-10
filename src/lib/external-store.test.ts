import { describe, expect, it, vi } from "vitest"

import { createExternalStore } from "@/lib/external-store"

describe("createExternalStore", () => {
  it("keeps the snapshot identity until it is replaced", () => {
    const initial = { count: 0 }
    const store = createExternalStore(initial)

    expect(store.getSnapshot()).toBe(initial)
    expect(store.getSnapshot()).toBe(store.getSnapshot())

    const next = { count: 1 }
    store.setSnapshot(next)

    expect(store.getSnapshot()).toBe(next)
  })

  it("notifies subscribers on change until they unsubscribe", () => {
    const store = createExternalStore(0)
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)

    store.setSnapshot(1)
    unsubscribe()
    store.setSnapshot(2)

    expect(listener).toHaveBeenCalledTimes(1)
  })

  it("does not notify when the snapshot is unchanged", () => {
    const state = { count: 0 }
    const store = createExternalStore(state)
    const listener = vi.fn()
    store.subscribe(listener)

    store.setSnapshot(state)

    expect(listener).not.toHaveBeenCalled()
  })

  it("finishes a notification round even if a listener unsubscribes another", () => {
    const store = createExternalStore(0)
    const later = vi.fn()
    let unsubscribeLater: () => void = () => undefined
    store.subscribe(() => {
      unsubscribeLater()
    })
    unsubscribeLater = store.subscribe(later)

    store.setSnapshot(1)
    store.setSnapshot(2)

    expect(later).toHaveBeenCalledTimes(1)
  })
})
