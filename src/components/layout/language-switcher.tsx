import { LanguagesIcon } from "lucide-react"
import { useTranslation } from "react-i18next"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  languageEndonyms,
  storeLanguagePreference,
  supportedLanguages,
  useLanguage,
  type Language,
} from "@/i18n"

/** Lists each language by its endonym; switching applies at once and is remembered. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation()
  const current = useLanguage()

  // Re-selecting the current language still records it as an explicit choice.
  const selectLanguage = (language: Language) => {
    storeLanguagePreference(language)
    if (language !== current) void i18n.changeLanguage(language)
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" className="max-sm:w-10 max-sm:px-0" />}
      >
        <LanguagesIcon aria-hidden="true" />
        {/* Accessible name "Language English": it includes the visible endonym. */}
        <span className="sr-only">{t("language.label")}</span>{" "}
        {/* Below `sm` the endonym is visually hidden but stays in the accessible name. */}
        <span lang={current} className="max-sm:sr-only">
          {languageEndonyms[current]}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{t("language.label")}</DropdownMenuLabel>
          <DropdownMenuRadioGroup value={current}>
            {supportedLanguages.map((language) => (
              <DropdownMenuRadioItem
                key={language}
                value={language}
                lang={language}
                closeOnClick
                onClick={() => {
                  selectLanguage(language)
                }}
              >
                {languageEndonyms[language]}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
