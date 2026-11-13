import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query"

import type { FamilyEdit, FamilyInput } from "@/domain/roadmap/family-changes"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { roadmapKeys } from "./roadmap-queries"

/** Every family write's mutation key, so the page can tell one is under way. */
const FAMILY_WRITE_KEY = ["family-write"] as const

/**
 * Reads the family list and the roadmaps again once a family write settles, whatever its
 * result, so the page shows what the data source now holds (S4).
 */
function useRereadAfterFamilyWrite() {
  const queryClient = useQueryClient()
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: roadmapKeys.families() }),
      queryClient.invalidateQueries({ queryKey: roadmapKeys.list() }),
    ])
}

/** Adds a family (STY-029 S2). A write is never retried. */
export function useAddFamily() {
  const repository = useRoadmapRepository()
  return useMutation({
    mutationKey: FAMILY_WRITE_KEY,
    mutationFn: (input: FamilyInput) => repository.addFamily(input),
    retry: false,
    onSettled: useRereadAfterFamilyWrite(),
  })
}

/** Renames or recolours a family and its roadmaps (STY-029 S4). Never retried. */
export function useChangeFamily() {
  const repository = useRoadmapRepository()
  return useMutation({
    mutationKey: FAMILY_WRITE_KEY,
    mutationFn: (edit: FamilyEdit) => repository.changeFamily(edit),
    retry: false,
    onSettled: useRereadAfterFamilyWrite(),
  })
}

/** Whether a family write is under way. */
export function useFamilyWriting(): boolean {
  return useIsMutating({ mutationKey: FAMILY_WRITE_KEY }) > 0
}
