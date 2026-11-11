import { act, waitFor } from "@testing-library/react"
import { describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { RoadmapChanges } from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { createInMemoryRoadmapRepository } from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { AppError } from "@/lib/errors"
import { renderHookWithProviders } from "@/test/render-with-providers"

import {
  roadmapItemsQueryOptions,
  roadmapListQueryOptions,
} from "./roadmap-queries"
import { usePublishRoadmapChanges } from "./use-publish-roadmap-changes"
import { useRoadmapItems } from "./use-roadmap-items"
import { useRoadmaps } from "./use-roadmaps"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}
const item = createTestRoadmapItem("First")
const changes: RoadmapChanges = {
  roadmap: { title: { base: "Product A roadmap", value: "Renamed roadmap" } },
  items: [
    {
      item,
      position: 0,
      fields: { title: { base: "First", value: "Renamed item" } },
    },
  ],
}

function repositoryWith(write?: { fails: "forbidden" | "unauthenticated" }) {
  const repository = createInMemoryRoadmapRepository(
    [createTestRoadmap("producta", "Product A roadmap")],
    { producta: [item] },
    { write },
  )
  const publish = vi.spyOn(repository, "publishRoadmapChanges")
  return { repository, publish }
}

/** The roadmap's list and items, read, and its publish. */
async function renderPublish(repository = repositoryWith().repository) {
  const rendered = renderHookWithProviders(
    () => ({
      roadmaps: useRoadmaps(),
      items: useRoadmapItems("producta"),
      publish: usePublishRoadmapChanges("producta"),
    }),
    { authState: connected, repository },
  )
  await waitFor(() => {
    expect(rendered.result.current.items.data).toBeDefined()
  })
  return rendered
}

describe("usePublishRoadmapChanges", () => {
  it("publishes, then reads the roadmap and its items again before settling", async () => {
    const { repository, publish } = repositoryWith()
    const { result, queryClient } = await renderPublish(repository)

    let outcome: unknown
    await act(async () => {
      outcome = await result.current.publish.mutateAsync(changes)
    })

    expect(outcome).toEqual({ status: "published" })
    expect(publish).toHaveBeenCalledWith("producta", changes)
    // Already in the cache when the publish settles, not merely on its way.
    expect(
      queryClient.getQueryData(
        roadmapListQueryOptions(repository).queryKey,
      )?.[0]?.title.en,
    ).toBe("Renamed roadmap")
    expect(
      queryClient.getQueryData(
        roadmapItemsQueryOptions(repository, "producta").queryKey,
      )?.[0]?.title.en,
    ).toBe("Renamed item")
  })

  it("never retries a failed publish", async () => {
    const { repository, publish } = repositoryWith()
    publish.mockRejectedValue(new AppError("network"))
    const { result } = await renderPublish(repository)

    await act(() =>
      result.current.publish.mutateAsync(changes).catch(() => undefined),
    )

    await waitFor(() => {
      expect(result.current.publish.error).toEqual(new AppError("network"))
    })
    expect(publish).toHaveBeenCalledOnce()
  })

  it("expires the session when the data source rejects it", async () => {
    const { repository } = repositoryWith({ fails: "unauthenticated" })
    const { result, authClient } = await renderPublish(repository)

    await act(() =>
      result.current.publish.mutateAsync(changes).catch(() => undefined),
    )

    expect(authClient.reportUnauthenticated).toHaveBeenCalledOnce()
  })
})
