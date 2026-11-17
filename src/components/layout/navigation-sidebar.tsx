import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { NavigationLandmark } from "./navigation-landmark"

export interface NavigationSidebarProps {
  /** Folded to a rail of icons (STY-054 D5). */
  folded: boolean
  onFoldedChange: (folded: boolean) => void
  children: ReactNode
}

/**
 * DHCW's navy left-hand navigation on a desktop (STY-054 D2): as tall as the screen and
 * kept there as the page scrolls (D7), as wide as `--navigation-width`, which the bars
 * pinned to the screen start after. Its button folds it to a rail and opens it again,
 * showing Lucide's `panel-left-close` while open and `panel-left-open` while folded
 * (D10, D11); it is one button throughout, so focus stays on it.
 */
export function NavigationSidebar({
  folded,
  onFoldedChange,
  children,
}: NavigationSidebarProps) {
  const { t } = useTranslation()
  const FoldIcon = folded ? PanelLeftOpenIcon : PanelLeftCloseIcon
  return (
    <div
      data-slot="navigation-sidebar"
      className="sticky top-0 flex h-svh w-(--navigation-width) shrink-0 flex-col self-start overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
    >
      <div className={cn("flex px-2 pt-3", !folded && "justify-end")}>
        <Button
          variant="header"
          size="icon"
          className={cn(folded && "w-full")}
          onClick={() => {
            onFoldedChange(!folded)
          }}
        >
          <FoldIcon aria-hidden="true" />
          <span className="sr-only">
            {folded
              ? t("layout.navigation.unfold")
              : t("layout.navigation.fold")}
          </span>
        </Button>
      </div>
      <NavigationLandmark>{children}</NavigationLandmark>
    </div>
  )
}
