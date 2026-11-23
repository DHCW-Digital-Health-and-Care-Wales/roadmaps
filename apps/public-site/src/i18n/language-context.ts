import { createContext, use } from "react"
import type { Route } from "../lib/router"
import type { Localised } from "../lib/types"
import type { Language } from "./languages"
import { resolve } from "./localised"
import { catalogues, type Strings } from "./strings"

export interface LanguageContextValue {
  /** The page's language, from its URL. */
  lang: Language
  route: Route
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)

/** The page's language and route, from LanguageProvider. */
export function useLanguage(): LanguageContextValue {
  const context = use(LanguageContext)
  if (!context) {
    throw new Error("useLanguage must be used within a LanguageProvider")
  }
  return context
}

/** The site's text in the page's language, read by property: `strings.site.backToTop`. */
export function useStrings(): Strings {
  return catalogues[useLanguage().lang]
}

/**
 * Content in the page's language. `lang` is set only when the text fell back to
 * English, for the element that shows it, so screen readers switch pronunciation
 * (WCAG 2.2 SC 3.1.2).
 */
export function useResolved(value: Localised): {
  text: string
  lang: Language | undefined
} {
  const { lang } = useLanguage()
  const resolved = resolve(value, lang)
  return {
    text: resolved.text,
    lang: resolved.lang === lang ? undefined : resolved.lang,
  }
}
