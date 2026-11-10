import { createContext } from "react"

import type { Theme } from "./theme-preference"

export interface ThemeContextValue {
  readonly theme: Theme
  readonly setTheme: (theme: Theme) => void
}

/** Provided by `ThemeProvider`; read it through `useTheme()`. */
export const ThemeContext = createContext<ThemeContextValue | null>(null)
