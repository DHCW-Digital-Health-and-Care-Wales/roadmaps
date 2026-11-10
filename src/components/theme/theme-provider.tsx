import { useLayoutEffect, useMemo, useState, type ReactNode } from "react"

import { ThemeContext } from "./theme-context"
import {
  applyTheme,
  readThemePreference,
  storeThemePreference,
  type Theme,
} from "./theme-preference"

/**
 * Owns the light/dark theme (ADR-0005). `index.html` applies the stored theme before
 * first paint; this keeps the document in step with later changes and remembers them.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState(readThemePreference)

  useLayoutEffect(() => {
    applyTheme(theme)
  }, [theme])

  const value = useMemo(
    () => ({
      theme,
      setTheme: (next: Theme) => {
        storeThemePreference(next)
        setThemeState(next)
      },
    }),
    [theme],
  )

  return <ThemeContext value={value}>{children}</ThemeContext>
}
