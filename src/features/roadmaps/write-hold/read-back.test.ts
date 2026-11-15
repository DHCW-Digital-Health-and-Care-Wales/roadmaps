import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { afterEach, describe, expect, it } from "vitest"

import { roadmapKeys } from "../hooks/roadmap-queries"
import { readBackAfterWrite } from "./read-back"

describe("readBackAfterWrite", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  afterEach(() => {
    queryClient.clear()
  })

  const observe = (queryFn: () => Promise<string[]>) =>
    new QueryObserver(queryClient, {
      queryKey: roadmapKeys.list(),
      queryFn,
    }).subscribe(() => undefined)
  const shown = async (queryFn: () => Promise<string[]>) => {
    const unsubscribe = observe(queryFn)
    await queryClient.refetchQueries({ queryKey: roadmapKeys.list() })
    return unsubscribe
  }

  it("waits for a read a page starts as it opens, between pages when the write answers", async () => {
    let reads = 0
    const read = async () => {
      reads += 1
      await new Promise((resolve) => setTimeout(resolve, 5))
      return [`read ${String(reads)}`]
    }
    ;(await shown(read))()

    const readBack = readBackAfterWrite(queryClient, ["roadmaps"])
    const unsubscribe = observe(read)

    await expect(readBack).resolves.toBe(true)
    expect(queryClient.getQueryData(roadmapKeys.list())).toEqual(["read 2"])
    unsubscribe()
  })

  it("tells a read that failed", async () => {
    let fail = false
    const unsubscribe = await shown(() =>
      fail ? Promise.reject(new Error("down")) : Promise.resolve([]),
    )
    fail = true

    await expect(readBackAfterWrite(queryClient, ["roadmaps"])).resolves.toBe(
      false,
    )
    unsubscribe()
  })
})
