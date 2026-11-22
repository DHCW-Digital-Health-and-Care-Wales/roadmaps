import { useTranslation } from "react-i18next"

import { defaultLanguage, isLanguage, type Language } from "./languages"

/** The interface's current language; components using it re-render when it changes. */
export function useLanguage(): Language {
  const { i18n } = useTranslation()
  return isLanguage(i18n.resolvedLanguage)
    ? i18n.resolvedLanguage
    : defaultLanguage
}
