import { useLocation } from "@tanstack/react-router"
import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import { useTranslation } from "react-i18next"

import { createSheetHandle } from "@/components/ui/sheet"
import { DESKTOP_WIDTH, useMediaQuery } from "@/lib/use-media-query"

import { AppFooter } from "./app-footer"
import { AppHeader } from "./app-header"
import { MAIN_ID } from "./main-landmark"
import { NavigationDrawer, NavigationMenuButton } from "./navigation-drawer"
import { NavigationDrawerContext } from "./navigation-drawer-context"
import {
  readNavigationFolded,
  storeNavigationFolded,
} from "./navigation-preference"
import { NavigationSidebar } from "./navigation-sidebar"
import { PageContainer } from "./page-container"
import { PhaseBanner } from "./phase-banner"
import { UnpublishedAnnouncement } from "./unpublished-announcement"
import { UnpublishedRoadmapsContext } from "./unpublished-roadmaps-context"

/**
 * How the navigation is drawn: in `full`, beside the page or in its drawer, or folded to
 * a `rail` of icons, each named for assistive technology (STY-054 D5).
 */
export type NavigationForm = "full" | "rail"

export interface AppShellProps {
  /** Header controls, composed by the root route. */
  headerActions: ReactNode
  /** The navigation's destinations in `form`, composed by the root route. */
  navigation: (form: NavigationForm) => ReactNode
  /**
   * The navigation's search in `form`, at the start of its top row, composed by the root
   * route (STY-061); `openNavigation` opens a rail, remembered as open, for its spyglass.
   */
  navigationSearch: (
    form: NavigationForm,
    openNavigation: () => void,
  ) => ReactNode
  /**
   * How many roadmaps have unpublished changes: the menu buttons carry a dot and say so
   * while it is above 0 (STY-055 D4), and a screen reader is told when it changes (S4).
   * The navigation draws its own count. A prop, not a context from the route, so a shell
   * without a count is a type error.
   */
  unpublishedRoadmaps: number
  children: ReactNode
}

/**
 * After an in-app navigation, moves focus to the new page's content, as a page load
 * would; otherwise focus is lost with the link that was clicked.
 */
function useFocusOnNavigation(target: RefObject<HTMLElement | null>) {
  const pathname = useLocation({ select: (location) => location.pathname })
  const previous = useRef(pathname)
  useEffect(() => {
    if (previous.current === pathname) return
    previous.current = pathname
    // The router restores scroll; focusing must not move it.
    target.current?.focus({ preventScroll: true })
  }, [pathname, target])
}

/**
 * When the focused control inside `target` disappears (Connect once connected, Retry once
 * loaded), moves focus to `target` rather than leaving it on the document body, so
 * keyboard and screen reader users carry on from the new content.
 */
function useRescueFocus(target: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const container = target.current
    if (!container) return
    let focused: Element | null = null
    const track = (event: FocusEvent) => {
      focused = event.target instanceof Element ? event.target : null
    }
    const observer = new MutationObserver(() => {
      const lost =
        document.activeElement === null ||
        document.activeElement === document.body
      if (focused && !focused.isConnected && lost) {
        focused = null
        container.focus({ preventScroll: true })
      }
    })
    container.addEventListener("focusin", track)
    observer.observe(container, { childList: true, subtree: true })
    return () => {
      container.removeEventListener("focusin", track)
      observer.disconnect()
    }
  }, [target])
}

/**
 * The navigation's fold on a desktop, remembered on this device (STY-054 D5).
 */
function useNavigationFolded() {
  const [folded, setFolded] = useState(readNavigationFolded)
  const fold = (next: boolean) => {
    setFolded(next)
    storeNavigationFolded(next)
  }
  return [folded, fold] as const
}

/**
 * Page frame, DHCW's dashboard shell (ADR-010, STY-054): skip link, the navigation, then
 * DHCW's header as its top bar, phase banner, the main landmark (which keeps focus) and
 * footer. Every page sits in DHCW's wide container with its main-wrapper spacing, so a
 * page renders its content only.
 *
 * On a desktop the navigation stands at the left, full height as the page scrolls past
 * (D7), open or folded to a rail; `--navigation-width` says how wide, so the bars pinned
 * to the screen start where it ends. Narrower, it is a drawer, opened by the menu button
 * at the start of the top bar and of a roadmap's sticky strip (D8, D9).
 */
export function AppShell({
  headerActions,
  navigation,
  navigationSearch,
  unpublishedRoadmaps,
  children,
}: AppShellProps) {
  const { t } = useTranslation()
  const main = useRef<HTMLElement>(null)
  useFocusOnNavigation(main)
  useRescueFocus(main)
  const desktop = useMediaQuery(DESKTOP_WIDTH)
  const [folded, setFolded] = useNavigationFolded()
  const [drawer] = useState(createSheetHandle)
  const form: NavigationForm = folded ? "rail" : "full"
  const openNavigation = () => {
    setFolded(false)
  }

  return (
    <NavigationDrawerContext value={desktop ? null : drawer}>
      <UnpublishedRoadmapsContext value={unpublishedRoadmaps}>
        <div
          className="flex min-h-svh"
          // Sets `--navigation-width` (globals.css) while the navigation stands beside the page.
          data-navigation={desktop ? (folded ? "folded" : "open") : undefined}
        >
          <a
            href={`#${MAIN_ID}`}
            className="sr-only z-50 rounded-lg text-body-xs font-bold focus:not-sr-only focus:fixed focus:top-2 focus:left-4 focus:focus-fill focus:px-3 focus:py-2 md:focus:left-10"
            onClick={(event) => {
              // Hash history owns the URL fragment, so move focus without navigating.
              event.preventDefault()
              main.current?.focus()
            }}
          >
            {t("layout.skipToContent")}
          </a>
          <UnpublishedAnnouncement count={unpublishedRoadmaps} />
          {desktop ? (
            <NavigationSidebar
              folded={folded}
              onFoldedChange={setFolded}
              search={navigationSearch(form, openNavigation)}
            >
              {navigation(form)}
            </NavigationSidebar>
          ) : (
            <NavigationDrawer
              handle={drawer}
              page={main}
              search={navigationSearch("full", openNavigation)}
            >
              {navigation("full")}
            </NavigationDrawer>
          )}
          {/* Its foot clears the pinned foot's height, inside the row the navigation
            sticks in, so the navigation stays full height to the page's end (D7). */}
          <div className="flex min-w-0 flex-1 flex-col pb-(--pinned-bottom)">
            <AppHeader
              start={<NavigationMenuButton variant="header" />}
              actions={headerActions}
            />
            <PhaseBanner />
            <main
              ref={main}
              id={MAIN_ID}
              tabIndex={-1}
              className="flex flex-1 flex-col outline-none"
            >
              <PageContainer className="flex flex-1 flex-col pt-6 pb-8 sm:pt-8">
                {children}
              </PageContainer>
            </main>
            <AppFooter />
          </div>
        </div>
      </UnpublishedRoadmapsContext>
    </NavigationDrawerContext>
  )
}
