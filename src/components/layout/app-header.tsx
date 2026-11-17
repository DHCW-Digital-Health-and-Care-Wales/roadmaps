import { Link } from "@tanstack/react-router"
import { useId, type ReactNode } from "react"
import { useTranslation } from "react-i18next"

import dhcwIcon from "@/assets/dhcw/dhcw-icon-white.svg"
import dhcwLogo from "@/assets/dhcw/nhsw-logo.svg"
import { WIDER_THAN_A_PHONE } from "@/lib/use-media-query"

import { PageContainer } from "./page-container"

export interface AppHeaderProps {
  /**
   * A control before the logo: the navigation's menu button, where there is a drawer
   * (STY-054 D9). It takes `variant="header"`, as the actions do.
   */
  start?: ReactNode
  /**
   * Controls on the right: status, preferences and the auth action. A button here takes
   * `variant="header"` (the default navy vanishes on the band). The row is tight in
   * Cymraeg from 375px to `lg`, where the service name wraps beside the menu button
   * rather than be cut, which `tests/e2e/shell.spec.ts` guards: a wider control can push
   * it past two lines or scroll the page sideways.
   */
  actions: ReactNode
}

/**
 * DHCW's navy header band (the same in both themes), the dashboard shell's top bar, not
 * sticky: the DHCW logo and the service name, which together are the home link, and the
 * shell's controls on the right. Below `sm` it shows the DHCW icon and a short name in
 * place of the full logo and name.
 */
export function AppHeader({ start, actions }: AppHeaderProps) {
  const { t } = useTranslation()
  const nameId = useId()

  return (
    // A size container: beside the desktop navigation it is narrower than the screen,
    // and its controls follow its own width (`ConnectionStatus`).
    <header className="@container bg-header text-header-foreground">
      <PageContainer className="flex min-h-16 items-center gap-1 py-3 sm:gap-3">
        {start}
        <Link
          to="/"
          // Named by the visible name and "home": a name from content would lead with the
          // logo's alternative text, and a label that differs from the shown name fails
          // WCAG 2.5.3 (DEF-002). The hidden name is not in it.
          aria-labelledby={nameId}
          // -ml-1 lines the logo up with the page content (the padding is the focus ring's room).
          className="-ml-1 flex min-w-0 items-center gap-2 rounded-lg border border-transparent p-1 outline-none focus-visible:focus-ring sm:gap-3"
        >
          <picture className="flex shrink-0">
            <source media={WIDER_THAN_A_PHONE} srcSet={dhcwLogo} />
            <img
              src={dhcwIcon}
              alt={t("layout.logoAlt")}
              className="h-8 w-auto sm:h-10 md:h-12"
            />
          </picture>
          <span id={nameId} className="min-w-0 text-heading-xs text-balance">
            <span className="sm:hidden">{t("common.shortAppName")}</span>
            <span className="max-sm:hidden">{t("common.headerName")}</span>{" "}
            <span className="sr-only">{t("layout.homeSuffix")}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
        </div>
      </PageContainer>
    </header>
  )
}
