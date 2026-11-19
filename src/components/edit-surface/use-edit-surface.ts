import { use } from "react"

import {
  EditSurfaceContext,
  type EditSurfaceContextValue,
} from "./edit-surface-context"

export function useEditSurface(): EditSurfaceContextValue {
  const value = use(EditSurfaceContext)
  if (!value) {
    throw new Error("useEditSurface must be used within an EditSurfaceProvider")
  }
  return value
}
