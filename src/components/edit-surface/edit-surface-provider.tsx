import { useMemo, useState, type ReactNode } from "react"

import { EditSurfaceContext } from "./edit-surface-context"
import {
  readEditSurface,
  storeEditSurface,
  type EditSurface,
} from "./edit-surface-preference"

/**
 * Owns where the item and roadmap forms open (STY-077): read as the app starts, kept in
 * this browser when it changes. The account menu changes it; `FormDialog` follows it. A
 * dialog the browser can't keep is not chosen: the forms stay the side panel (STY-083
 * S4).
 */
export function EditSurfaceProvider({ children }: { children: ReactNode }) {
  const [surface, setSurfaceState] = useState(readEditSurface)

  const value = useMemo(
    () => ({
      surface,
      setSurface: (next: EditSurface) => {
        const kept = storeEditSurface(next)
        if (kept || next === "panel") setSurfaceState(next)
      },
    }),
    [surface],
  )

  return <EditSurfaceContext value={value}>{children}</EditSurfaceContext>
}
