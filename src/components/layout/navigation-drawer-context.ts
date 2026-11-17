import { createContext } from "react"

import { createSheetHandle } from "@/components/ui/sheet"

/** The drawer every menu button opens, one per shell. */
export type NavigationDrawerHandle = ReturnType<typeof createSheetHandle>

export const createNavigationDrawerHandle = createSheetHandle

/** The drawer's handle while the shell draws its navigation as a drawer; else `null`. */
export const NavigationDrawerContext =
  createContext<NavigationDrawerHandle | null>(null)
