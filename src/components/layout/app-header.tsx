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
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur-md supports-backdrop-filter:bg-background/65">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <Link
          to="/"
          aria-label={t("layout.home")}
          className="-mx-1.5 flex items-center gap-2.5 rounded-lg px-1.5 py-1 outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <BrandMark />
          {/* Below `sm` the name is hidden; the link's label still carries it. */}
          <span className="text-[0.9375rem] font-semibold tracking-tight max-sm:hidden">
            {t("common.appName")}
          </span>
        </Link>
        <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
          {actions}
        </div>
      </div>
    </header>
  )
}
