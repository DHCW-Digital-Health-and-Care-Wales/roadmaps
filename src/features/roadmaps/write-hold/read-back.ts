import type { QueryClient, QueryKey } from "@tanstack/react-query"

import type { RoadmapRepository } from "@/domain/roadmap/roadmap-repository"
import { isAppError } from "@/lib/errors"

import {
  familyListQueryOptions,
  organisationListQueryOptions,
  roadmapItemsQueryOptions,
  roadmapKeys,
  roadmapListQueryOptions,
} from "../hooks/roadmap-queries"
import type { HoldRead } from "./write-hold-store"

/** What a roadmap's page reads, so what a hold after a write from it reads. */
export function roadmapPageReads(roadmapId: string): HoldRead[] {
  return ["roadmaps", { items: roadmapId }, "organisations"]
}

function keyOf(read: HoldRead): QueryKey {
  if (read === "roadmaps") return roadmapKeys.list()
  if (read === "families") return roadmapKeys.families()
  if (read === "organisations") return roadmapKeys.organisations()
  return roadmapKeys.items(read.items)
}

/**
 * Reads `reads` again once a write has answered, as their pages would, and tells whether
 * every one read: what the hold then waits on (DEF-015). A read a page shows counts only
 * if it answered since then: one that failed, or was cancelled as the session ended,
 * leaves what was cached before. A read no page shows is not made, and counts unless the
 * last one failed, as the next read of it, once a page does, holds what was written.
 */
export async function readBackAfterWrite(
  queryClient: QueryClient,
  reads: readonly HoldRead[],
): Promise<boolean> {
  const since = Date.now()
  const keys = reads.map(keyOf)
  await Promise.all(
    keys.map(async (queryKey) => {
      await queryClient.invalidateQueries({ queryKey })
      await fetchesSettled(queryClient, queryKey)
    }),
  )
  return keys.every((queryKey) => {
    const query = queryClient.getQueryCache().find({ queryKey, exact: true })
    if (!query) return true
    if (query.getObserversCount() === 0) return query.state.status !== "error"
    return (
      query.state.status === "success" && query.state.dataUpdatedAt >= since
    )
  })
}

/**
 * Waits out any read of `queryKey` still under way, as a page opening while the write
 * answered, with none showing the query then, starts one the invalidation didn't.
 */
async function fetchesSettled(queryClient: QueryClient, queryKey: QueryKey) {
  while (queryClient.getQueryState(queryKey)?.fetchStatus === "fetching") {
    await queryClient.refetchQueries(
      { queryKey, exact: true },
      { cancelRefetch: false },
    )
  }
}

/**
 * Reads each of `reads` from the data source now, whether or not a page shows it: a
 * hold's Refresh, which the reader can press again, so a failure is not retried. Rejects
 * with the first failure; otherwise tells whether every read answered, as one cancelled
 * as the session ended comes back with what was cached before. A roadmap's items that
 * are gone count as read, as the roadmap list read with them says so.
 */
export async function readNow(
  queryClient: QueryClient,
  repository: RoadmapRepository,
  reads: readonly HoldRead[],
): Promise<boolean> {
  const since = Date.now()
  const results = await Promise.allSettled(
    reads.map(async (read) => {
      try {
        await fetchRead(queryClient, repository, read)
      } catch (error) {
        if (typeof read === "object" && isAppError(error)) {
          if (error.kind === "not-found") return true
        }
        throw error
      }
      const state = queryClient.getQueryState(keyOf(read))
      return state !== undefined && state.dataUpdatedAt >= since
    }),
  )
  let answered = true
  for (const result of results) {
    if (result.status === "rejected") throw result.reason
    answered &&= result.value
  }
  return answered
}

function fetchRead(
  queryClient: QueryClient,
  repository: RoadmapRepository,
  read: HoldRead,
): Promise<unknown> {
  const fresh = { staleTime: 0, retry: false } as const
  switch (read) {
    case "roadmaps":
      return queryClient.query({
        ...roadmapListQueryOptions(repository),
        ...fresh,
      })
    case "families":
      return queryClient.query({
        ...familyListQueryOptions(repository),
        ...fresh,
      })
    case "organisations":
      return queryClient.query({
        ...organisationListQueryOptions(repository),
        ...fresh,
      })
    default:
      return queryClient.query({
        ...roadmapItemsQueryOptions(repository, read.items),
        ...fresh,
      })
  }
}
