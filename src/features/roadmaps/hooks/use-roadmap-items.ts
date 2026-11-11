import { useQuery } from "@tanstack/react-query"

import { useAuth } from "@/features/auth/use-auth"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapItemsQueryOptions } from "./roadmap-queries"

/**
 * One roadmap's items, fetching only while connected, like the list: cached items stay
 * readable while the session is expired, and disconnecting removes them.
 */
export function useRoadmapItems(roadmapId: string) {
  const repository = useRoadmapRepository()
  const connected = useAuth().state.status === "connected"
  return useQuery({
    ...roadmapItemsQueryOptions(repository, roadmapId),
    enabled: connected,
  })
}
