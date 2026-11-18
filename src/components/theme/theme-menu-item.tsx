import { MoonIcon, SunIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { DropdownMenuItem } from "@/components/ui/dropdown-menu"

import { useTheme } from "./use-theme"

/**
 * A menu item that switches between light and dark; the label names the theme it
 * switches to. It closes the menu, which hands focus back to its trigger.
 */
export function ThemeMenuItem() {
  const { t } = useTranslation()
  const { theme, setTheme } = useTheme()
  const isDark = theme === "dark"
  const Icon = isDark ? SunIcon : MoonIcon

  return (
    <DropdownMenuItem
      onClick={() => {
        setTheme(isDark ? "light" : "dark")
      }}
    >
      <Icon aria-hidden="true" />
      {t(isDark ? "theme.switchToLight" : "theme.switchToDark")}
    </DropdownMenuItem>
  )
}
