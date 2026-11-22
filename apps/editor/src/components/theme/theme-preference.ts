export const themes = ["light", "dark"] as const
export type Theme = (typeof themes)[number]

/** Light unless the user chose otherwise (ADR-005). */
const defaultTheme: Theme = "light"

/** Also read by the no-flash script in `index.html`; keep the two in step. */
export const THEME_STORAGE_KEY = "roadmaps.theme"

function isTheme(value: unknown): value is Theme {
  return themes.includes(value as Theme)
}

/** The stored theme, or the default. Storage may be unavailable (e.g. blocked). */
export function readThemePreference(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return isTheme(stored) ? stored : defaultTheme
  } catch {
    return defaultTheme
  }
}

/** Remembers the theme (non-sensitive). Failing to store it is not an error. */
export function storeThemePreference(theme: Theme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // The choice still applies for this visit.
  }
}

/** Applies the theme to the document: the `dark` class drives every colour token. */
export function applyTheme(theme: Theme, doc: Document = document): void {
  doc.documentElement.classList.toggle("dark", theme === "dark")
}
