import { act, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vitest"

import type { AuthState } from "@/domain/auth/auth-client"
import type { Roadmap } from "@/domain/roadmap/roadmap"
import {
  NO_CHANGES,
  type PublishOutcome,
  type RoadmapChanges,
} from "@/domain/roadmap/roadmap-changes"
import { createTestRoadmap } from "@/domain/roadmap/testing/test-roadmap"
import { createTestRoadmapItem } from "@/domain/roadmap/testing/test-roadmap-item"
import { createInMemoryRoadmapRepository } from "@/features/roadmaps/testing/in-memory-roadmap-repository"
import { AppError } from "@/lib/errors"
import { renderHookWithProviders } from "@/test/render-with-providers"

import {
  withCurrentItemText,
  withCurrentRoadmapText,
} from "../editing/conflicts"
import {
  roadmapItemsQueryOptions,
  roadmapListQueryOptions,
} from "./roadmap-queries"
import {
  usePublishRoadmapChanges,
  type CurrentText,
} from "./use-publish-roadmap-changes"
import { useRoadmapItems } from "./use-roadmap-items"
import { useRoadmaps } from "./use-roadmaps"

const connected: AuthState = {
  status: "connected",
  expiresAt: Date.now() + 3_600_000,
}
const item = createTestRoadmapItem("First")
const changes: RoadmapChanges = {
  ...NO_CHANGES,
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

const currentText: CurrentText = {
  roadmap: withCurrentRoadmapText,
  items: withCurrentItemText,
}

/** The roadmap's list and items, read, and its publish. */
async function renderPublish(repository = repositoryWith().repository) {
  const rendered = renderHookWithProviders(
    () => ({
      roadmaps: useRoadmaps(),
      items: useRoadmapItems("producta"),
      publish: usePublishRoadmapChanges("producta", { currentText }),
    }),
    { authState: connected, repository },
  )
  await waitFor(() => {
    expect(rendered.result.current.items.data).toBeDefined()
  })
  return rendered
}

describe("usePublishRoadmapChanges", () => {
  afterEach(() => {
    vi.useRealTimers()
  })

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

  /** A refusal of the roadmap's title, which a co-lead changed to "Their title". */
  const refusal: PublishOutcome = {
    status: "refused",
    conflicts: [
      {
        subject: "roadmap",
        field: "title",
        base: "Product A roadmap",
        pending: "Renamed roadmap",
        current: "Their title",
      },
    ],
    missingItems: [],
  }

  /**
   * Holds a publish open while `meanwhile` reads the roadmap again, then refuses it, with
   * every read after it failing; returns the roadmap's title as the page then has it.
   */
  async function titleAfterRefusal(
    meanwhile: (
      repository: ReturnType<typeof repositoryWith>["repository"],
    ) => void,
  ) {
    vi.useFakeTimers({ toFake: ["Date"] })
    const { repository, publish } = repositoryWith()
    let refuse: ((outcome: PublishOutcome) => void) | undefined
    publish.mockReturnValue(
      new Promise<PublishOutcome>((resolve) => {
        refuse = resolve
      }),
    )
    const { result, queryClient } = await renderPublish(repository)
    const published = result.current.publish.mutateAsync(changes)
    await vi.waitFor(() => {
      expect(publish).toHaveBeenCalled()
    })
    meanwhile(repository)
    // The read starts and lands after the publish began.
    vi.setSystemTime(Date.now() + 1_000)
    await act(() => queryClient.refetchQueries())
    vi.spyOn(repository, "listRoadmaps").mockRejectedValue(
      new AppError("forbidden"),
    )

    await act(async () => {
      refuse?.(refusal)
      await published
    })

    return queryClient.getQueryData<readonly Roadmap[]>(
      roadmapListQueryOptions(repository).queryKey,
    )?.[0]?.title.en
  }

  it("leaves text read while a refused publish was pending, though reading again fails", async () => {
    const title = await titleAfterRefusal((repository) => {
      repository.coLead(([roadmap]) => {
        if (roadmap) {
          roadmap.title = { ...roadmap.title, en: "Their later title" }
        }
      })
    })

    expect(title).toBe("Their later title")
  })

  it("shows the refusal's text over a read during the publish that still holds the text edited from", async () => {
    const title = await titleAfterRefusal(() => undefined)

    expect(title).toBe("Their title")
  })
})
