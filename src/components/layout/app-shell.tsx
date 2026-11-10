import { useLocation } from "@tanstack/react-router"
import { useEffect, useRef, type ReactNode, type RefObject } from "react"
import { useTranslation } from "react-i18next"

import { AppFooter } from "./app-footer"
import { AppHeader } from "./app-header"
import { PageContainer } from "./page-container"
import { PhaseBanner } from "./phase-banner"

export interface AppShellProps {
  /** Header controls, composed by the root route. */
  headerActions: ReactNode
  children: ReactNode
}

const MAIN_ID = "main-content"

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
 * Page frame: skip link, DHCW header, phase banner, the main landmark (which keeps focus)
 * and footer. Every page sits in DHCW's wide container with its main-wrapper spacing, so a
 * page renders its content only.
 *
 * There is no sidebar yet. The dashboard shell, with the roadmaps in its navigation and the
 * header's chips in its top bar, comes with the first record that adds a second top-level
 * destination or the roadmap editor: see ADR-010, "Deferred: the dashboard shell".
 */
export function AppShell({ headerActions, children }: AppShellProps) {
  const { t } = useTranslation()
  const main = useRef<HTMLElement>(null)
  useFocusOnNavigation(main)
  useRescueFocus(main)

  return (
    <div className="flex min-h-svh flex-col">
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
      <AppHeader actions={headerActions} />
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
  )
}
