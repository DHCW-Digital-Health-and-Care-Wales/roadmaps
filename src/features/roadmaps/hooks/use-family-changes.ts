import { useIsMutating, useMutation } from "@tanstack/react-query"

import type {
  FamilyEdit,
  FamilyInput,
  FamilyOutcome,
} from "@/domain/roadmap/family-changes"

import { useRoadmapRepository } from "../roadmap-repository-context"
import { useReadBackOrHold, writeAnswer } from "../write-hold/hold-after-write"

/** Every family write's mutation key, so the page can tell one is under way. */
const FAMILY_WRITE_KEY = ["family-write"] as const

/**
 * Reads the family list and the roadmaps again once a family write settles, whatever its
 * result, so the page shows what the data source now holds (S4). Once a family saved
 * isn't read back, or the answer was lost, the app is held until a Refresh reads it
 * (DEF-015).
 */
function useRereadAfterFamilyWrite() {
  const readBackOrHold = useReadBackOrHold()
  return (outcome: FamilyOutcome | undefined) =>
    readBackOrHold(
      { write: "family", reads: ["families", "roadmaps"] },
      writeAnswer(outcome?.status, "saved"),
    )
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
