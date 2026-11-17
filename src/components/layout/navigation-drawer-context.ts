import { createContext } from "react"

import type { createSheetHandle } from "@/components/ui/sheet"

/** The drawer every menu button opens, one per shell (`createSheetHandle`). */
export type NavigationDrawerHandle = ReturnType<typeof createSheetHandle>

/** The drawer's handle while the shell draws its navigation as a drawer; else `null`. */
export const NavigationDrawerContext =
  createContext<NavigationDrawerHandle | null>(null)
