import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import dhcwIcon from "@/assets/dhcw/dhcw-icon-white.svg"
import dhcwLogo from "@/assets/dhcw/nhsw-logo.svg"

import { PageContainer } from "./page-container"

export interface AppHeaderProps {
  /** Controls on the right: status, preferences and the auth action. */
  actions: ReactNode
}

/**
 * DHCW's navy header band (the same in both themes), not sticky: the DHCW logo and the
 * service name, which together are the home link, and the shell's controls on the right.
 * Below `sm` it shows the DHCW icon and a short name in place of the full logo and name.
 */
export function AppHeader({ actions }: AppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="bg-header text-header-foreground">
      <PageContainer className="flex min-h-16 items-center gap-1 py-3 sm:gap-3">
        <Link
          to="/"
          // The service's full name, whichever of the visible names is shown.
          aria-label={t("layout.home")}
          // -ml-1 lines the logo up with the page content (the padding is the focus ring's room).
          className="-ml-1 flex min-w-0 items-center gap-2 rounded-lg border border-transparent p-1 outline-none focus-visible:focus-ring sm:gap-3"
        >
          <picture className="flex shrink-0">
            <source media="(min-width: 40rem)" srcSet={dhcwLogo} />
            <img
              src={dhcwIcon}
              alt={t("layout.logoAlt")}
              className="h-8 w-auto sm:h-10 md:h-12"
            />
          </picture>
          <span className="truncate text-heading-xs">
            <span className="sm:hidden">{t("common.shortAppName")}</span>
            <span className="max-sm:hidden">{t("common.headerName")}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
        </div>
      </PageContainer>
    </header>
  )
}
