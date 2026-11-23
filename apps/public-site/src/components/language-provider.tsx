import { useEffect, useMemo } from "react"
import type { ReactNode } from "react"
import { defaultLanguage, LanguageContext } from "../i18n"
import { useRoute, type Route } from "../lib/router"

/**
 * Provides the current route and its language (from the URL path), from which
 * `useStrings()` reads the page's text, and keeps the document `lang` attribute
 * in sync. The prerender passes `serverRoute` because there is no URL to read.
 */
export function LanguageProvider({
  serverRoute,
  children,
}: {
  serverRoute?: Route
  children: ReactNode
}) {
  const route = useRoute(serverRoute)
  const lang = route.lang ?? defaultLanguage

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, route }), [lang, route])

  return <LanguageContext value={value}>{children}</LanguageContext>
}
