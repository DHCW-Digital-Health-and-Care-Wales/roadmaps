import { useMutation, useQueryClient } from "@tanstack/react-query"

import type { FamilyEdit, FamilyInput } from "@/domain/roadmap/family-changes"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/**
 * Adds a family, or changes one and its roadmaps (STY-029). A write is never retried;
 * whatever its result, the family list and the roadmaps are read again before it
 * settles, so the page shows what the data source now holds (S4).
 */
export function useFamilyChanges() {
  const repository = useRoadmapRepository()
  const queryClient = useQueryClient()
  const reread = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: roadmapKeys.families() }),
      queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
    ])
  const add = useMutation({
    mutationFn: (input: FamilyInput) => repository.addFamily(input),
    retry: false,
    onSettled: reread,
  })
  const change = useMutation({
    mutationFn: (edit: FamilyEdit) => repository.changeFamily(edit),
    retry: false,
    onSettled: reread,
  })
  return { add, change }
}
