import { createContext } from "react"

import type { EditSurface } from "./edit-surface-preference"

export interface EditSurfaceContextValue {
  readonly surface: EditSurface
  readonly setSurface: (surface: EditSurface) => void
}

/** Provided by `EditSurfaceProvider`; read it through `useEditSurface()`. */
export const EditSurfaceContext = createContext<EditSurfaceContextValue | null>(
  null,
)
