import { useState } from "react"

import {
  checkFamilyInput,
  type FamilyField,
  type FamilyInput,
  type FamilyInputProblems,
} from "@/domain/roadmap/family-changes"
import type { Family } from "@/domain/roadmap/family"

/**
 * A family form's input check (S6): the problems the last attempt found, and a request
 * to focus the first field with one, for `FamilyForm`.
 */
export function useFamilyInputCheck(
  families: readonly Family[],
  ownId?: string,
) {
  const [problems, setProblems] = useState<FamilyInputProblems>({})
  const [focusRequest, setFocusRequest] = useState<{
    field: FamilyField
  } | null>(null)

  const refuse = (found: FamilyInputProblems) => {
    setProblems(found)
    setFocusRequest({ field: found.name ? "name" : "colour" })
  }

  /** The input checked and trimmed, or `null` once its problems are shown. */
  const check = (values: FamilyInput): FamilyInput | null => {
    const { input, problems: found } = checkFamilyInput(values, families, ownId)
    if (found.name || found.colour) {
      refuse(found)
      return null
    }
    setProblems({})
    return input
  }

  return {
    problems,
    focusRequest,
    check,
    refuse,
    clearFocusRequest: () => {
      setFocusRequest(null)
    },
  }
}
