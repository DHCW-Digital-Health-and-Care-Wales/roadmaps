import { Link } from "@tanstack/react-router"
import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

import { BrandMark } from "./brand-mark"

export interface AppHeaderProps {
  /** Controls on the right: status, preferences and the auth action. */
  actions: ReactNode
}

/** Sticky header: product name (home link) and the shell's controls. */
export function AppHeader({ actions }: AppHeaderProps) {
  const { t } = useTranslation()

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-2 px-4 sm:gap-3 sm:px-6">
        <Link
          to="/"
          aria-label={t("layout.home")}
          className="-mx-1.5 flex min-w-0 items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none focus-visible:focus-fill"
        >
          <BrandMark />
          {/* Below `sm` a short name; the link's label carries the full one. */}
          <span className="truncate text-body font-semibold">
            <span className="sm:hidden">{t("common.shortAppName")}</span>
            <span className="max-sm:hidden">{t("common.appName")}</span>
          </span>
        </Link>
        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-1.5">
          {actions}
        </div>
      </div>
    </header>
  )
}
