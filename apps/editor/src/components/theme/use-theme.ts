import { use } from "react"

import { ThemeContext, type ThemeContextValue } from "./theme-context"

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext)
  if (!value) throw new Error("useTheme must be used within a ThemeProvider")
  return value
}
