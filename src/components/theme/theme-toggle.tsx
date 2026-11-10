import { MoonIcon, SunIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"

import { useTheme } from "./use-theme"

/** Switches between light and dark; the label names the theme it switches to. */
export function ThemeToggle() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"

  return (
    <Button
      variant="header"
      size="icon"
      // The narrow header's buttons are all 32px, so the brand keeps its name.
      className="max-sm:size-8"
      aria-label={t(isDark ? "theme.switchToLight" : "theme.switchToDark")}
      onClick={() => {
        setTheme(isDark ? "light" : "dark")
      }}
    >
      {isDark ? (
        <SunIcon aria-hidden="true" />
      ) : (
        <MoonIcon aria-hidden="true" />
      )}
    </Button>
  )
}
