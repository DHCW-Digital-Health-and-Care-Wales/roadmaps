import { useQuery } from "@tanstack/react-query"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useEnabledWhileConnected } from "./enabled-while-connected"
import { organisationListQueryOptions } from "./roadmap-queries"

/**
 * The organisation list (ADR-014), fetched while connected, like the roadmap's items,
 * which name organisations by id. The list is data the repository serves, never a
 * constant.
 */
export function useOrganisations() {
  const repository = useRoadmapRepository()
  return useQuery(
    useEnabledWhileConnected(organisationListQueryOptions(repository)),
  )
}
