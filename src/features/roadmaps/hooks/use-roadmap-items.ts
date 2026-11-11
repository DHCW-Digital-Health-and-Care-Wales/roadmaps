import { useQuery } from "@tanstack/react-query"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import { roadmapItemsQueryOptions } from "./roadmap-queries"

/** One roadmap's items, fetched only while connected, like the list. */
export function useRoadmapItems(roadmapId: string) {
  const repository = useRoadmapRepository()
  return useQuery(
    useEnabledWhileConnected(roadmapItemsQueryOptions(repository, roadmapId)),
  )
}
