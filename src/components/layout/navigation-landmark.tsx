import type { ReactNode } from "react"
import { useTranslation } from "react-i18next"

/** The shell's navigation landmark, beside the page or in its drawer (STY-054). */
export function NavigationLandmark({ children }: { children: ReactNode }) {
  const { t } = useTranslation()
  return (
    <nav
      aria-label={t("layout.navigation.label")}
      className="flex flex-col gap-3 px-2 pt-2 pb-4"
    >
      {children}
    </nav>
  )
}
