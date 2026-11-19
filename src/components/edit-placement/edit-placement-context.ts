import { createContext, use } from "react"

import type { EditPlacement } from "./edit-placement-preference"

export interface EditPlacementContextValue {
  readonly placement: EditPlacement
  readonly setPlacement: (placement: EditPlacement) => void
}

/** Provided by `EditPlacementProvider`; read it through `useEditPlacement()`. */
export const EditPlacementContext =
  createContext<EditPlacementContextValue | null>(null)

export function useEditPlacement(): EditPlacementContextValue {
  const value = use(EditPlacementContext)
  if (!value) {
    throw new Error(
      "useEditPlacement must be used within an EditPlacementProvider",
    )
  }
  return value
}
