import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { afterEach, describe, expect, it, vi } from "vitest"

import { roadmapKeys } from "../hooks/roadmap-queries"
import { readBackAfterWrite } from "./read-back"

describe("readBackAfterWrite", () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  afterEach(() => {
    vi.restoreAllMocks()
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
    ;(await shown(() => Promise.resolve(["read 1"])))()
    // The opening page's read answers only once the read-back, after the page has
    // opened, asks for the read again: the read is under way until it waits for it.
    let opened = false
    let answerPageRead: (rows: string[]) => void = () => undefined
    const pageRead = new Promise<string[]>((resolve) => {
      answerPageRead = resolve
    })
    const refetch = queryClient.refetchQueries.bind(queryClient)
    vi.spyOn(queryClient, "refetchQueries").mockImplementation((...args) => {
      if (opened) answerPageRead(["read 2"])
      return refetch(...args)
    })

    const readBack = readBackAfterWrite(queryClient, ["roadmaps"])
    const unsubscribe = observe(() => pageRead)
    opened = true

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
