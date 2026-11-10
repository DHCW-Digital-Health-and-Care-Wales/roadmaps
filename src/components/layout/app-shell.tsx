import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { AppHeader } from "./app-header"

export interface AppShellProps {
  /** Header controls, composed by the root route. */
  headerActions: ReactNode
  children: ReactNode
}

const MAIN_ID = "main-content"

/** Page frame: skip link, sticky header and the main landmark. */
export function AppShell({ headerActions, children }: AppShellProps) {
  const { t } = useTranslation()

  return (
    <div className="flex min-h-svh flex-col">
      <a
        href={`#${MAIN_ID}`}
        className="sr-only z-50 rounded-lg border bg-background text-sm font-medium shadow-md ring-3 ring-ring/50 focus:not-sr-only focus:fixed focus:top-2.5 focus:left-3 focus:px-3 focus:py-2"
        onClick={(event) => {
          // Hash history owns the URL fragment, so move focus without navigating.
          event.preventDefault()
          document.getElementById(MAIN_ID)?.focus()
        }}
      >
        {t("layout.skipToContent")}
      </a>
      <AppHeader actions={headerActions} />
      <main
        id={MAIN_ID}
        tabIndex={-1}
        className="flex flex-1 flex-col outline-none"
      >
        {children}
      </main>
    </div>
  )
}
