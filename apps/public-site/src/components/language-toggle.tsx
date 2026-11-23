import {
  languageEndonyms,
  storeLanguagePreference,
  supportedLanguages,
  useLanguage,
  useStrings,
} from "../i18n"
import { onNavigate, pathFor, useOrgFilter, withOrgFilter } from "../lib/router"

/**
 * Language toggle: links to this page in each language, so it works without
 * JavaScript. The current language is conveyed in text and by aria-current,
 * not by colour alone.
 */
export function LanguageToggle() {
  const { lang, route } = useLanguage()
  const filter = useOrgFilter()
  const strings = useStrings()

  return (
    <div
      role="group"
      aria-label={strings.site.chooseLanguage}
      className="inline-flex rounded-sm border border-white/40"
    >
      {supportedLanguages.map((option) => {
        const isActive = lang === option
        const path = pathFor(option, route.slug)
        // The filter is in the link too, so it is kept in a new tab.
        const href = withOrgFilter(path, filter)
        return (
          <a
            key={option}
            href={href}
            lang={option}
            hrefLang={option}
            onClick={(event) => {
              storeLanguagePreference(option)
              const { search, hash } = window.location
              onNavigate(`${path}${search}${hash}`, { scroll: false })(event)
            }}
            aria-current={isActive ? "page" : undefined}
            className={`relative px-3 py-1.5 text-sm font-medium transition-colors first:rounded-l-sm last:rounded-r-sm focus-visible:z-10 ${
              isActive
                ? "bg-white text-nhs-wales-blue"
                : "bg-transparent text-white hover:bg-white/15"
            }`}
          >
            {languageEndonyms[option]}
          </a>
        )
      })}
    </div>
  )
}
