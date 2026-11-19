import { useMemo, useState, type ReactNode } from "react"

import { EditPlacementContext } from "./edit-placement-context"
import {
  readEditPlacement,
  storeEditPlacement,
  type EditPlacement,
} from "./edit-placement-preference"

/**
 * Owns where the item and roadmap forms open (STY-077): read as the app starts, kept in
 * this browser when it changes. The account menu changes it; `FormDialog` follows it.
 */
export function EditPlacementProvider({ children }: { children: ReactNode }) {
  const [placement, setPlacementState] = useState(readEditPlacement)

  const value = useMemo(
    () => ({
      placement,
      setPlacement: (next: EditPlacement) => {
        storeEditPlacement(next)
        setPlacementState(next)
      },
    }),
    [placement],
  )

  return <EditPlacementContext value={value}>{children}</EditPlacementContext>
}
