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

import {
  NavigationDrawerContext,
  type NavigationDrawerHandle,
} from "./navigation-drawer-context"
import { NavigationLandmark } from "./navigation-landmark"

export interface NavigationMenuButtonProps {
  /** `header` on the navy top bar, `secondary` on the page. */
  variant: "header" | "secondary"
}

/**
 * The button that opens the navigation's drawer, where the shell has one (narrower than
 * a desktop); elsewhere nothing. The shell's top bar starts with one, and a roadmap's
 * sticky strip with another once stuck (STY-054 D8, D9): closing the drawer returns
 * focus to the one that opened it.
 */
export function NavigationMenuButton({ variant }: NavigationMenuButtonProps) {
  const { t } = useTranslation()
  const drawer = useContext(NavigationDrawerContext)
  if (!drawer) return null
  return (
    <SheetTrigger
      handle={drawer}
      render={
        <Button
          variant={variant}
          size={variant === "header" ? "icon-sm" : "icon"}
        />
      }
    >
      <MenuIcon aria-hidden="true" />
      <span className="sr-only">{t("layout.navigation.menu")}</span>
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
function choseLink(event: MouseEvent): boolean {
  const plain =
    event.button === 0 &&
    !event.metaKey &&
    !event.ctrlKey &&
    !event.shiftKey &&
    !event.altKey
  return (
    plain &&
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
          if (!choseLink(event)) return
          chosen.current = true
          handle.close()
        }}
        // Read more than once as it closes, so the choice is cleared only as it opens. Base
        // UI would move on from `<main>` to its first tabbable element, so focus is moved
        // to the page once closed instead.
        finalFocus={() => !chosen.current}
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
