import { MenuIcon, XIcon } from "lucide-react"
import {
  type MouseEvent,
  type ReactNode,
  type RefObject,
  useContext,
  useRef,
} from "react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { isPlainClick } from "@/lib/plain-click"
import { cn } from "@/lib/utils"

import {
  NavigationDrawerContext,
  type NavigationDrawerHandle,
} from "./navigation-drawer-context"
import { NavigationLandmark } from "./navigation-landmark"
import { UnpublishedDot } from "./unpublished-dot"
import { UnpublishedRoadmapsContext } from "./unpublished-roadmaps-context"

export interface NavigationMenuButtonProps {
  /** `header` on the navy top bar, `secondary` on the page. */
  variant: "header" | "secondary"
}

/**
 * The button that opens the navigation's drawer, where the shell has one (narrower than
 * a desktop); elsewhere nothing. The shell's top bar starts with one, and a roadmap's
 * sticky strip with another once stuck (STY-054 D8, D9): closing the drawer returns
 * focus to the one that opened it. While any roadmap has unpublished changes it carries a
 * dot and its name says how many (STY-055 D4), since the drawer hides the navigation's
 * own count.
 */
export function NavigationMenuButton({ variant }: NavigationMenuButtonProps) {
  const { t } = useTranslation()
  const drawer = useContext(NavigationDrawerContext)
  const unpublished = useContext(UnpublishedRoadmapsContext)
  if (!drawer) return null
  return (
    <SheetTrigger
      handle={drawer}
      render={
        <Button
          variant={variant}
          size={variant === "header" ? "icon-sm" : "icon"}
          className="relative"
        />
      }
    >
      <MenuIcon aria-hidden="true" />
      {unpublished > 0 && (
        <UnpublishedDot
          // The ring cuts the dot from the button, whose colour it stands on.
          className={cn(
            "absolute top-1 right-1 size-2.5 ring-2",
            variant === "header"
              ? "bg-focus ring-header group-focus-visible/button:bg-focus-foreground"
              : "bg-status-info-border ring-background",
          )}
        />
      )}
      <span className="sr-only">
        {unpublished > 0
          ? t("layout.navigation.menuUnpublished", { roadmaps: unpublished })
          : t("layout.navigation.menu")}
      </span>
    </SheetTrigger>
  )
}

export interface NavigationDrawerProps {
  handle: NavigationDrawerHandle
  /** Where focus goes once a link in the drawer is chosen: the page it leads to. */
  page: RefObject<HTMLElement | null>
  children: ReactNode
}

/**
 * A link in the drawer was pressed to open its page here: a plain click, as the router
 * follows; one with a modifier key opens it elsewhere, leaving this page as it is.
 */
function isPlainLinkClick(event: MouseEvent): boolean {
  return (
    isPlainClick(event) &&
    event.target instanceof Element &&
    !!event.target.closest("a[href]")
  )
}

/**
 * The navigation as a drawer over the page, from the screen's left edge (STY-054 S5): a
 * modal dialog, so focus stays in it while it is open. Closing it returns focus to the
 * menu button that opened it, unless a link was chosen: then it closes and focus moves
 * to the page, as on any navigation (S1).
 */
export function NavigationDrawer({
  handle,
  page,
  children,
}: NavigationDrawerProps) {
  const { t } = useTranslation()
  const chosen = useRef(false)
  // Back to the menu button that opened it, unless a link was chosen. Read more than once
  // as it closes, so the choice clears only as it opens. Base UI would move on from
  // `<main>` to its first tabbable element, so focus is moved to the page once closed.
  const returnToMenuButton = () => !chosen.current
  return (
    <Sheet
      handle={handle}
      onOpenChange={(open) => {
        if (open) chosen.current = false
      }}
      onOpenChangeComplete={(open) => {
        if (!open && chosen.current)
          page.current?.focus({ preventScroll: true })
      }}
    >
      <SheetContent
        className="overflow-y-auto border-r border-sidebar-border bg-sidebar text-sidebar-foreground"
        onClick={(event) => {
          if (!isPlainLinkClick(event)) return
          chosen.current = true
          handle.close()
        }}
        finalFocus={returnToMenuButton}
      >
        <div className="flex items-center justify-between gap-3 px-4 pt-3">
          <SheetTitle className="text-heading-xs">
            {t("layout.navigation.menu")}
          </SheetTitle>
          <SheetClose render={<Button variant="header" size="icon-sm" />}>
            <XIcon aria-hidden="true" />
            <span className="sr-only">{t("layout.navigation.closeMenu")}</span>
          </SheetClose>
        </div>
        <NavigationLandmark>{children}</NavigationLandmark>
      </SheetContent>
    </Sheet>
  )
}
