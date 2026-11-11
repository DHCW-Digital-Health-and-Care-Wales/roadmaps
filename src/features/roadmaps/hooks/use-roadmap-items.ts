import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { toAppError } from "@/lib/errors"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import { roadmapItemsQueryOptions, roadmapKeys } from "./roadmap-queries"

/**
 * Whether an items read failed because the roadmap has left the list since it was read
 * (D11): its page then says the roadmap is not found.
 */
export function isRoadmapGone(error: Error | null): boolean {
  return error !== null && toAppError(error).kind === "not-found"
}

/**
 * One roadmap's items, fetched only while connected, like the list. When the roadmap is
 * gone (`isRoadmapGone`), the list is read again so its page can say so.
 */
export function useRoadmapItems(roadmapId: string) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const query = useQuery(
    useEnabledWhileConnected(roadmapItemsQueryOptions(repository, roadmapId)),
  )

  // Not while a read is in flight: a cached failure from an earlier visit is about to be
  // replaced, and the list need not be read again for it.
  const gone = isRoadmapGone(query.error) && !query.isFetching
  const { errorUpdatedAt } = query
  useEffect(() => {
    if (gone) {
      // Each component using the hook asks; a read already under way answers them all.
      void queryClient.invalidateQueries(
        { queryKey: roadmapKeys.list() },
        { cancelRefetch: false },
      )
    }
  }, [gone, errorUpdatedAt, queryClient])

  return query
}
