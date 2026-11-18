import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { cn } from "@/lib/utils"

export interface NavigationLandmarkProps {
  /** Folded to a rail: its top row stacks, and its list scrolls with no scrollbar. */
  rail?: boolean
  /** The top row's controls, kept in view while the list scrolls under them. */
  top: ReactNode
  children: ReactNode
}

/**
 * The shell's navigation landmark, beside the page or in its drawer (STY-054): its top
 * row, then its destinations, which scroll under the row as it stays in place (STY-061
 * S8). In a rail the list scrolls by wheel, touch and keyboard with no scrollbar to take
 * room from the marks (S9).
 */
export function NavigationLandmark({
  rail = false,
  top,
  children,
}: NavigationLandmarkProps) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t("layout.navigation.label")}
      className="flex min-h-0 flex-1 flex-col"
    >
      <div
        className={cn(
          "flex shrink-0 gap-2 px-2 pt-3",
          rail ? "flex-col" : "items-center",
        )}
      >
        {top}
      </div>
      <div
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-2 pt-2 pb-4",
          rail && "[scrollbar-width:none]",
        )}
      >
        {children}
      </div>
    </nav>
  )
}
