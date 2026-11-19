import { afterEach, describe, expect, it, vi } from "vitest"

import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { addingItems, NEW_CLINIC } from "@/domain/roadmap/testing/test-new-item"
import { matchMediaQueries } from "@/test/media-query"

import { pageItemsOf } from "../testing/page-items"
import { travel, travelNames } from "./item-travel"

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)"

const read = (...ids: (string | null)[]) =>
  ids.map((id, at) => createTestRoadmapItem(`Item ${String(at)}`, { id }))

describe("travelNames (STY-072)", () => {
  it("names each item by its ID, a new item by its own, and an item without one not at all", () => {
    const names = travelNames(
      pageItemsOf(read("pzj9ds3p", null), addingItems(NEW_CLINIC)),
    )

    expect([...names]).toEqual([
      ["read-0", "item-pzj9ds3p"],
      ["new:ckn7q2xw", "new-ckn7q2xw"],
    ])
  })

  it("names no item whose ID another has too, so no two share a name", () => {
    const names = travelNames(
      pageItemsOf(read("same", "other", "same"), addingItems()),
    )

    expect([...names]).toEqual([["read-1", "item-other"]])
  })

  it("writes every character but an ASCII letter, digit or hyphen as its code point, so each ID has a name of its own", () => {
    const names = travelNames(
      pageItemsOf(read("Tŷ–1", "T_177__2013_1", "a b.c"), addingItems()),
    )

    expect([...names.values()]).toEqual([
      "item-T_177__2013_1",
      "item-T_5f_177_5f__5f_2013_5f_1",
      "item-a_20_b_2e_c",
    ])
    for (const name of names.values()) expect(name).toMatch(/^[\w-]+$/)
  })
})

describe("travel (STY-072)", () => {
  const update = vi.fn()

  afterEach(() => {
    update.mockReset()
    vi.unstubAllGlobals()
    Reflect.deleteProperty(document, "startViewTransition")
  })

  /** A browser with view transitions and their types, recording each started. */
  function withViewTransitions() {
    const finished = Promise.resolve()
    const transition = {
      finished,
      ready: finished,
      updateCallbackDone: finished,
      skipTransition: vi.fn(),
    }
    const start = vi.fn((options: StartViewTransitionOptions) => {
      options.update?.()
      return transition
    })
    vi.stubGlobal(
      "ViewTransition",
      class {
        get types() {
          return new Set<string>()
        }
      },
    )
    Object.defineProperty(document, "startViewTransition", {
      configurable: true,
      value: start,
    })
    return start
  }

  it("makes the move as a view transition typed by how far it goes", () => {
    const start = withViewTransitions()

    travel("within", update)
    travel("across", update)

    expect(start.mock.calls.map(([options]) => options.types)).toEqual([
      ["item-move"],
      ["item-move-across"],
    ])
    expect(update).toHaveBeenCalledTimes(2)
  })

  it("makes the move at once where the system asks for reduced motion (S4)", () => {
    const start = withViewTransitions()
    matchMediaQueries(REDUCED_MOTION)

    travel("within", update)

    expect(start).not.toHaveBeenCalled()
    expect(update).toHaveBeenCalledOnce()
  })

  it("makes the move at once in a browser without view transitions (S4)", () => {
    travel("across", update)

    expect(update).toHaveBeenCalledOnce()
  })
})
