import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { toAppError } from "@/lib/errors"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import { roadmapItemsQueryOptions, roadmapKeys } from "./roadmap-queries"

/**
 * One roadmap's items, fetched only while connected, like the list. A `not-found` read
 * means the roadmap has left the list since it was read, so the list is read again and
 * its page can say the roadmap is gone (D11).
 */
export function useRoadmapItems(roadmapId: string) {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const query = useQuery(
    useEnabledWhileConnected(roadmapItemsQueryOptions(repository, roadmapId)),
  )

  const gone =
    query.error !== null && toAppError(query.error).kind === "not-found"
  const { errorUpdatedAt } = query
  useEffect(() => {
    if (gone) {
      void queryClient.invalidateQueries({ queryKey: roadmapKeys.list() })
    }
  }, [gone, errorUpdatedAt, queryClient])

  return query
}
