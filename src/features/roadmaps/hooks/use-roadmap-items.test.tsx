import { act, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { createInMemoryRoadmapRepository } from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { AppError } from "@/lib/errors"
import { renderHookWithProviders } from "@/test/render-with-providers"

import { roadmapKeys, roadmapListQueryOptions } from "./roadmap-queries"
import { useRoadmapItems } from "./use-roadmap-items"
import { connected } from "@/test/connected-state"

const roadmaps = [createTestRoadmap("producta", "Product A roadmap")]
const items = [
  createTestRoadmapItem("First"),
  createTestRoadmapItem("Second", { placement: "next" }),
]

/** An in-memory repository whose items reads are counted. */
function spiedRepository() {
  const repository = createInMemoryRoadmapRepository(roadmaps, {
    producta: items,
  })
  const listRoadmapItems = vi.spyOn(repository, "listRoadmapItems")
  return { repository, listRoadmapItems }
}

describe("useRoadmapItems", () => {
  it("loads a roadmap's items while connected", async () => {
    const { repository, listRoadmapItems } = spiedRepository()

    const { result } = renderHookWithProviders(
      () => useRoadmapItems("producta"),
      { authState: connected, repository },
    )

    await waitFor(() => {
      expect(result.current.data).toEqual(items)
    })
    expect(listRoadmapItems).toHaveBeenCalledWith("producta", {
      signal: expect.any(AbortSignal) as AbortSignal,
    })
  })

  it("requests no items while not connected (S7)", async () => {
    const { repository, listRoadmapItems } = spiedRepository()

    const { result } = renderHookWithProviders(
      () => useRoadmapItems("producta"),
      { repository },
    )

    await act(() => Promise.resolve())
    expect(result.current.fetchStatus).toBe("idle")
    expect(result.current.data).toBeUndefined()
    expect(listRoadmapItems).not.toHaveBeenCalled()
  })

  it("removes the items on disconnect and fetches them again after reconnecting (S7)", async () => {
    const { repository, listRoadmapItems } = spiedRepository()
    const { result, authClient, queryClient } = renderHookWithProviders(
      () => useRoadmapItems("producta"),
      { authState: connected, repository },
    )
    await waitFor(() => {
      expect(result.current.data).toEqual(items)
    })

    act(() => {
      authClient.disconnect()
    })

    expect(queryClient.getQueryData(roadmapKeys.items("producta"))).toBe(
      undefined,
    )
    expect(result.current.data).toBeUndefined()
    expect(listRoadmapItems).toHaveBeenCalledTimes(1)

    act(() => {
      authClient.connect()
    })

    await waitFor(() => {
      expect(result.current.data).toEqual(items)
    })
    expect(listRoadmapItems).toHaveBeenCalledTimes(2)
  })

  it("expires the session on a 401, as the list does (S6)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: new AppError("unauthenticated", { status: 401 }),
    })

    const { result, authClient } = renderHookWithProviders(
      () => useRoadmapItems("producta"),
      { authState: connected, repository },
    )

    await waitFor(() => {
      expect(authClient.getSnapshot().status).toBe("expired")
    })
    expect(result.current.error).toMatchObject({ kind: "unauthenticated" })
    expect(authClient.reportUnauthenticated).toHaveBeenCalledOnce()
  })

  it("fails with not-found for a roadmap the data source does not list", async () => {
    const { result } = renderHookWithProviders(
      () => useRoadmapItems("unknown"),
      { authState: connected, roadmaps, roadmapItems: { producta: items } },
    )

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ kind: "not-found" })
    })
  })

  it("reads the roadmap list again when the roadmap is not found (STY-021 D11)", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps)
    const listRoadmaps = vi.spyOn(repository, "listRoadmaps")
    const { queryClient } = renderHookWithProviders(
      () => useRoadmapItems("unknown"),
      { authState: connected, repository },
    )
    await queryClient.query(roadmapListQueryOptions(repository))
    expect(listRoadmaps).toHaveBeenCalledOnce()

    await waitFor(() => {
      expect(queryClient.getQueryState(roadmapKeys.list())?.isInvalidated).toBe(
        true,
      )
    })
  })

  it("leaves the roadmap list alone when the items fail otherwise", async () => {
    const repository = createInMemoryRoadmapRepository(roadmaps, {
      producta: new AppError("invalid-data"),
    })
    const { result, queryClient } = renderHookWithProviders(
      () => useRoadmapItems("producta"),
      { authState: connected, repository },
    )
    await queryClient.query(roadmapListQueryOptions(repository))

    await waitFor(() => {
      expect(result.current.error).toMatchObject({ kind: "invalid-data" })
    })
    expect(queryClient.getQueryState(roadmapKeys.list())?.isInvalidated).toBe(
      false,
    )
  })
})
