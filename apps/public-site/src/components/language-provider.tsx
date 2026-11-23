import { useEffect, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { I18nextProvider } from "react-i18next"
import type { i18n } from "i18next"
import {
  createI18n,
  defaultLanguage,
  LanguageContext,
  supportedLanguages,
  type Language,
} from "../i18n"
import { useRoute, type Route } from "../lib/router"

/**
 * Provides the current route, its language (from the URL path) and an i18next
 * instance in that language, and keeps the document `lang` attribute in sync.
 * Each language has its own instance, so a change of language renders the new
 * page in one pass. The prerender passes `serverRoute` because there is no URL
 * to read.
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
  const [instances] = useState(
    () =>
      Object.fromEntries(
        supportedLanguages.map((language) => [
          language,
          createI18n({ language }),
        ]),
      ) as Record<Language, i18n>,
  )

  useEffect(() => {
    document.documentElement.lang = lang
  }, [lang])

  const value = useMemo(() => ({ lang, route }), [lang, route])

  return (
    <I18nextProvider i18n={instances[lang]}>
      <LanguageContext value={value}>{children}</LanguageContext>
    </I18nextProvider>
  )
}
